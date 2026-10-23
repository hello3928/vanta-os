// Steam account sign-in and the owned-games list, through Steam's own Web API.
//
// Sign-in uses the same QR flow as Steam's sign-in page: Vanta asks Steam for a sign-in request
// (IAuthenticationService/BeginAuthSessionViaQR), shows its link as a QR code, and polls until
// it's approved in the Steam Mobile App. Vanta never sees a password. The approval gives a
// refresh token (kept in ~/.config/vanta/steam/<steamid>.json, readable only by the user) that
// gets short-lived access tokens for the Web API: owned games, profile name and avatar.
//
// The Steam client signs in separately, in its own window, the first time a game is installed
// or played; it doesn't take tokens from other programs.
pragma Singleton
import QtQuick
import dev.vanta.shell

QtObject {
    id: steam

    readonly property Sys sys: Sys {}
    readonly property string api: "https://api.steampowered.com"
    readonly property string dir: sys.configDir + "/steam"
    readonly property string cacheDir: sys.env("XDG_CACHE_HOME") ? sys.env("XDG_CACHE_HOME") + "/vanta" : sys.home + "/.cache/vanta"

    // ---------- sign-in ----------
    signal signedIn(var account)
    property string phase: ""          // "" | starting | waiting | scanned | approved | failed
    property string lastId: ""         // the account approved most recently (setup has no profile yet)
    property string challengeUrl: ""
    property var qr: null              // { size, bits } for challengeUrl
    property string clientId: ""
    property string requestId: ""

    // Steam's Web API takes form fields and answers in JSON. x-eresult 1 is OK.
    function call(method, path, fields, done) {
        const xhr = new XMLHttpRequest()
        const body = Object.keys(fields).map(k => encodeURIComponent(k) + "=" + encodeURIComponent(fields[k])).join("&")
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== XMLHttpRequest.DONE) return
            // Most answers are wrapped in { response }; a few older ones (GetFriendList) aren't.
            let res = null
            try { const j = JSON.parse(xhr.responseText); res = j.response !== undefined ? j.response : j } catch (e) {}
            const result = parseInt(xhr.getResponseHeader("x-eresult") || "0")
            done(xhr.status === 200 && result === 1 ? res : null, result, xhr.status)
        }
        if (method === "GET") {
            xhr.open("GET", api + path + "?" + body)
            xhr.send()
        } else {
            xhr.open("POST", api + path)
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
            xhr.send(body)
        }
    }

    function begin() {
        poll.stop()
        phase = "starting"
        call("POST", "/IAuthenticationService/BeginAuthSessionViaQR/v1/",
             { device_friendly_name: "Vanta OS", platform_type: 2, website_id: "Community" }, res => {
            if (!res || !res.challenge_url) { phase = "failed"; return }
            clientId = res.client_id
            requestId = res.request_id
            showChallenge(res.challenge_url)
            phase = "waiting"
            poll.interval = Math.max(2, res.interval || 5) * 1000
            poll.start()
        })
    }

    function cancel() {
        poll.stop()
        phase = ""
    }

    function showChallenge(url) {
        challengeUrl = url
        try { qr = JSON.parse(sys.qrCode(url)) } catch (e) { qr = null }
    }

    readonly property Timer poll: Timer {
        repeat: true
        onTriggered: steam.call("POST", "/IAuthenticationService/PollAuthSessionStatus/v1/",
                                { client_id: steam.clientId, request_id: steam.requestId }, (res, result) => {
            if (!steam.poll.running) return
            // The request ran out (result 9 or 27): ask for a new code.
            if (!res) { if (result === 9 || result === 27) steam.begin(); return }
            if (res.new_challenge_url) {
                steam.clientId = res.new_client_id || steam.clientId
                steam.showChallenge(res.new_challenge_url)
            }
            if (res.had_remote_interaction && steam.phase === "waiting") steam.phase = "scanned"
            if (res.refresh_token) {
                steam.poll.stop()
                steam.approved(res.refresh_token, res.access_token || "", res.account_name || "")
            }
        })
    }

    function approved(refresh, access, accountName) {
        const id = tokenClaims(refresh).sub || tokenClaims(access).sub || ""
        if (!id) { phase = "failed"; return }
        saveSession(id, { steamId: id, accountName: accountName, refreshToken: refresh, accessToken: access })
        phase = "approved"
        lastId = id
        profile(id, p => signedIn({
            steamId: id, accountName: accountName,
            persona: p ? p.personaname : accountName, avatar: p ? p.avatarfull : "",
            since: p && p.timecreated ? new Date(p.timecreated * 1000).getFullYear() : 0
        }))
    }

    // ---------- tokens ----------
    // Steam's tokens are JWTs: the payload has the account (sub) and the expiry (exp).
    function tokenClaims(token) {
        try {
            let b = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
            while (b.length % 4) b += "="
            return JSON.parse(Qt.atob(b))
        } catch (e) { return {} }
    }

    function session(id) { try { return JSON.parse(sys.readText(dir + "/" + id + ".json")) } catch (e) { return null } }
    function saveSession(id, s) { sys.writePrivate(dir + "/" + id + ".json", JSON.stringify(s)) }
    function forget(id) { sys.remove(dir + "/" + id + ".json"); sys.remove(cacheDir + "/steam-owned-" + id + ".json") }
    function hasSession(id) { const s = session(id); return !!(s && s.refreshToken) }

    // A valid access token for the account, renewed from the refresh token when it's near expiry.
    function accessToken(id, done) {
        const s = session(id)
        if (!s || !s.refreshToken) return done("")
        if (s.accessToken && (tokenClaims(s.accessToken).exp || 0) > Date.now() / 1000 + 120) return done(s.accessToken)
        call("POST", "/IAuthenticationService/GenerateAccessTokenForApp/v1/", { refresh_token: s.refreshToken, steamid: id }, res => {
            if (!res || !res.access_token) return done("")
            s.accessToken = res.access_token
            if (res.refresh_token) s.refreshToken = res.refresh_token
            saveSession(id, s)
            done(s.accessToken)
        })
    }

    // ---------- profile and games ----------
    // Name and picture: the Web API first, then the account's community profile (its name and
    // picture are public even when the rest of the profile is private).
    function profile(id, done) {
        accessToken(id, token => {
            if (!token) return communityProfile(id, done)
            call("GET", "/ISteamUser/GetPlayerSummaries/v2/", { access_token: token, steamids: id }, res => {
                const p = res && res.players && res.players.length ? res.players[0] : null
                if (p && p.avatarfull) done(p)
                else communityProfile(id, done)
            })
        })
    }

    function communityProfile(id, done) {
        const xhr = new XMLHttpRequest()
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== XMLHttpRequest.DONE) return
            const text = xhr.status === 200 ? xhr.responseText : ""
            const field = name => {
                const m = new RegExp("<" + name + ">(?:<!\\[CDATA\\[)?([^<\\]]*)").exec(text)
                return m ? m[1].trim() : ""
            }
            const since = /(\d{4})/.exec(field("memberSince"))
            done(field("steamID") ? { personaname: field("steamID"), avatarfull: field("avatarFull"),
                                      timecreated: since ? Date.UTC(parseInt(since[1]), 0, 1) / 1000 : 0 } : null)
        }
        xhr.open("GET", "https://steamcommunity.com/profiles/" + id + "/?xml=1")
        xhr.send()
    }

    // Every game the account owns: [{ appid, name, playtime_forever (minutes), rtime_last_played }].
    // The last answer is cached so the library shows offline too.
    property var owned: ({})           // steamid → games
    property bool loadingOwned: false

    function cachedOwned(id) {
        if (owned[id]) return owned[id]
        try { return JSON.parse(sys.readText(cacheDir + "/steam-owned-" + id + ".json")) } catch (e) { return [] }
    }

    function loadOwned(id) {
        if (!id || !hasSession(id)) return
        loadingOwned = true
        accessToken(id, token => {
            if (!token) { loadingOwned = false; return }
            call("GET", "/IPlayerService/GetOwnedGames/v1/",
                 { access_token: token, steamid: id, include_appinfo: 1, include_played_free_games: 1 }, res => {
                loadingOwned = false
                if (!res || !res.games) return
                const games = res.games.map(g => ({ appid: g.appid, name: g.name, minutes: g.playtime_forever || 0, lastPlayed: g.rtime_last_played || 0 }))
                sys.writeText(cacheDir + "/steam-owned-" + id + ".json", JSON.stringify(games))
                const next = Object.assign({}, owned)
                next[id] = games
                owned = next
            })
        })
    }

    // ---------- friends ----------
    // [{ steamId, name, photo, state: "ingame" | "online" | "away" | "offline", game }], playing
    // and online first. The list from IFriendsListService (or the older ISteamUser call), names,
    // pictures and status from GetPlayerSummaries, or from each friend's community profile where
    // that call doesn't accept this kind of token.
    property var friends: []
    readonly property var stateOrder: ({ ingame: 0, online: 1, away: 2, offline: 3 })

    function loadFriends(id) {
        if (!id || !hasSession(id)) { friends = []; return }
        accessToken(id, token => {
            if (!token) return
            call("GET", "/IFriendsListService/GetFriendsList/v1/", { access_token: token }, res => {
                const list = res && res.friendslist && res.friendslist.friends
                if (list) return friendDetails(token, list.filter(f => f.efriendrelationship === 3).map(f => f.ulfriendid))
                call("GET", "/ISteamUser/GetFriendList/v1/", { access_token: token, steamid: id, relationship: "friend" }, old => {
                    const l = old && old.friendslist && old.friendslist.friends
                    if (l) friendDetails(token, l.map(f => f.steamid))
                })
            })
        })
    }

    function friendDetails(token, ids) {
        if (!ids.length) { friends = []; return }
        call("GET", "/ISteamUser/GetPlayerSummaries/v2/", { access_token: token, steamids: ids.slice(0, 100).join(",") }, res => {
            if (res && res.players && res.players.length) {
                const state = p => p.gameextrainfo ? "ingame" : p.personastate === 0 ? "offline" : p.personastate >= 2 ? "away" : "online"
                setFriends(res.players.map(p => ({ steamId: p.steamid, name: p.personaname, photo: p.avatarmedium || p.avatarfull || "",
                                                   state: state(p), game: p.gameextrainfo || "" })))
                return
            }
            // One community profile per friend, the first 30.
            const found = []
            const ask = ids.slice(0, 30)
            let left = ask.length
            ask.forEach(fid => communityFriend(fid, f => {
                if (f) found.push(f)
                if (--left === 0) setFriends(found)
            }))
        })
    }

    function communityFriend(fid, done) {
        const xhr = new XMLHttpRequest()
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== XMLHttpRequest.DONE) return
            const text = xhr.status === 200 ? xhr.responseText : ""
            const field = name => {
                const m = new RegExp("<" + name + ">(?:<!\\[CDATA\\[)?([^<\\]]*)").exec(text)
                return m ? m[1].trim() : ""
            }
            if (!field("steamID")) return done(null)
            const online = field("onlineState")
            const game = online === "in-game" ? field("gameName") : ""
            done({ steamId: fid, name: field("steamID"), photo: field("avatarMedium"), game: game,
                   state: game ? "ingame" : online === "online" ? "online" : online === "away" ? "away" : "offline" })
        }
        xhr.open("GET", "https://steamcommunity.com/profiles/" + fid + "/?xml=1")
        xhr.send()
    }

    function setFriends(list) {
        friends = list.sort((a, b) => (stateOrder[a.state] - stateOrder[b.state]) || a.name.localeCompare(b.name))
    }
}
