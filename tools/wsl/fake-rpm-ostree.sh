#!/bin/bash
# A stand-in for rpm-ostree, for testing the update screen without a real update: prints what
# rpm-ostree prints for a container image update, at a slower pace. The shell uses it when
# VANTA_RPM_OSTREE points here.
#   FAKE_UPDATE=none   no update available
#   FAKE_UPDATE=busy   another update is running (fails like rpm-ostree does)
#   FAKE_UPDATE=fail   the download fails partway
#   FAKE_PACE=0.5      seconds per step (default 1)
pace=${FAKE_PACE:-1}
case "$1 $2" in
  "status --json")
    echo '{"deployments":[{"booted":true,"container-image-reference":"ostree-unverified-registry:ghcr.io/hello3928/vanta-os:stable"}]}'
    exit 0 ;;
  "upgrade --check")
    sleep "$pace"
    [ "$FAKE_UPDATE" = none ] && { echo "No updates available."; exit 77; }
    echo "Note: --check and --preview may be unreliable.  See https://github.com/coreos/rpm-ostree/issues/1579"
    echo "AvailableUpdate:"
    echo "        Digest: sha256:4f1c9a0e2b7d61c55a3f8e0d9b2c7a14e6f05d3b9c8a71e2f4d6b0c3a9e8f712"
    echo "       Version: 0.1.4 (2026-10-24T09:12:40Z)"
    exit 0 ;;
  "upgrade ")
    if [ "$FAKE_UPDATE" = busy ]; then
      echo "error: Transaction in progress: upgrade (initiated by uupd)" >&2
      echo " You can cancel the current transaction with \`rpm-ostree cancel\`" >&2
      exit 1
    fi
    [ "$FAKE_UPDATE" = none ] && { echo "No upgrade available."; exit 0; }
    echo "Pulling manifest: ostree-unverified-registry:ghcr.io/hello3928/vanta-os:stable"; sleep "$pace"
    echo "Importing: ostree-unverified-registry:ghcr.io/hello3928/vanta-os:stable (digest: sha256:4f1c9a0e2b7d)"
    echo "ostree chunk layers already present: 61"
    echo "ostree chunk layers needed: 4 (1.2 GB)"
    echo "custom layers already present: 2"
    echo "custom layers needed: 3 (38.1 MB)"
    sleep "$pace"
    for l in "ostree chunk sha256:1a2b3c4d5e6f (812.0 MB)" "ostree chunk sha256:7a8b9c0d1e2f (204.6 MB)" \
             "ostree chunk sha256:3f4e5d6c7b8a (121.3 MB)" "ostree chunk sha256:9e8d7c6b5a4f (62.1 MB)" \
             "layer sha256:0c1d2e3f4a5b (24.0 MB)" "layer sha256:6b7c8d9e0f1a (12.1 MB)" "layer sha256:2a3b4c5d6e7f (2.0 MB)"; do
      printf "Fetching %s... " "$l"; sleep "$pace"; sleep "$pace"
      if [ "$FAKE_UPDATE" = fail ] && [[ $l == *7a8b* ]]; then
        echo
        echo "error: Importing: Unencapsulating base: Fetching blob sha256:7a8b9c0d1e2f: error sending request: connection reset" >&2
        exit 1
      fi
      echo "done"
    done
    printf "Staging deployment..."; sleep "$pace"; sleep "$pace"; echo "done"
    echo "Upgraded:"
    echo "  vanta-shell 0.1.3-1 -> 0.1.4-1"
    echo "Run \"systemctl reboot\" to start a reboot"
    exit 0 ;;
esac
echo "fake-rpm-ostree: $*: not faked" >&2
exit 1
