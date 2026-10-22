//! Controllers: buttons become the same console actions the keyboard gives (see Main.qml),
//! with D-pad and stick auto-repeat, and rumble for haptics. Uses gilrs (evdev on Linux), so
//! it reads every controller the kernel knows, including handheld built-ins that InputPlumber
//! exposes as a gamepad.
//!
//! Actions: up, down, left, right, accept (A), back (B), options (X), qam (Start),
//! mainMenu (Guide or View), prevTab, nextTab (bumpers).

#[cxx_qt::bridge]
pub mod qobject {
    unsafe extern "C++" {
        include!("cxx-qt-lib/qstring.h");
        type QString = cxx_qt_lib::QString;
    }

    extern "RustQt" {
        #[qobject]
        #[qml_element]
        #[qproperty(i32, count)]
        #[qproperty(QString, family)]
        #[qproperty(QString, names)]
        type Gamepads = super::GamepadsRust;

        #[qsignal]
        fn action(self: Pin<&mut Gamepads>, name: QString, repeat: bool);

        #[qsignal]
        #[cxx_name = "padConnected"]
        fn pad_connected(self: Pin<&mut Gamepads>, name: QString, family: QString);

        #[qsignal]
        #[cxx_name = "padDisconnected"]
        fn pad_disconnected(self: Pin<&mut Gamepads>, name: QString);

        /// Start reading controllers (once).
        #[qinvokable]
        fn start(self: Pin<&mut Gamepads>);

        /// Rumble every controller that can: motor levels 0..1 for `ms` milliseconds.
        #[qinvokable]
        fn rumble(self: &Gamepads, weak: f64, strong: f64, ms: i32);
    }

    impl cxx_qt::Threading for Gamepads {}
}

use core::pin::Pin;
use cxx_qt::{CxxQtType, Threading};
use cxx_qt_lib::QString;
use gilrs::{
    ff::{BaseEffect, BaseEffectType, EffectBuilder, Replay, Ticks},
    Axis, Button, EventType, GamepadId, Gilrs,
};
use std::{
    collections::VecDeque,
    sync::mpsc::{channel, Receiver, Sender},
    thread,
    time::{Duration, Instant},
};

const REPEAT_DELAY: Duration = Duration::from_millis(360);
const REPEAT_RATE: Duration = Duration::from_millis(105);
const STICK: f32 = 0.55;

#[derive(Default)]
pub struct GamepadsRust {
    count: i32,
    family: QString,
    names: QString,
    rumble_tx: Option<Sender<(f32, f32, u32)>>,
}

/// Controller family from the USB vendor: Sony, Nintendo, Valve, else Xbox-style.
fn family_of(vendor: Option<u16>, name: &str) -> &'static str {
    let n = name.to_lowercase();
    match vendor {
        Some(0x054c) => "ps",
        Some(0x057e) => "nintendo",
        Some(0x28de) => "deck",
        _ if n.contains("playstation") || n.contains("dualsense") || n.contains("dualshock") => "ps",
        _ if n.contains("nintendo") || n.contains("pro controller") || n.contains("joy-con") => "nintendo",
        _ if n.contains("steam deck") || n.contains("valve") => "deck",
        _ => "xbox",
    }
}

fn button_action(b: Button) -> Option<&'static str> {
    Some(match b {
        Button::South => "accept",
        Button::East => "back",
        Button::West => "options",
        Button::LeftTrigger => "prevTab",
        Button::RightTrigger => "nextTab",
        Button::Start => "qam",
        Button::Select | Button::Mode => "mainMenu",
        _ => return None,
    })
}

fn dpad_dir(b: Button) -> Option<&'static str> {
    Some(match b {
        Button::DPadUp => "up",
        Button::DPadDown => "down",
        Button::DPadLeft => "left",
        Button::DPadRight => "right",
        _ => return None,
    })
}

impl qobject::Gamepads {
    pub fn start(mut self: Pin<&mut Self>) {
        if self.rust().rumble_tx.is_some() {
            return;
        }
        let (tx, rx) = channel();
        self.as_mut().rust_mut().rumble_tx = Some(tx);
        let qt = self.qt_thread();
        thread::spawn(move || run(qt, rx));
    }

    pub fn rumble(&self, weak: f64, strong: f64, ms: i32) {
        if let Some(tx) = &self.rust().rumble_tx {
            let _ = tx.send((weak.clamp(0.0, 1.0) as f32, strong.clamp(0.0, 1.0) as f32, ms.max(1) as u32));
        }
    }
}

fn q(s: &str) -> QString {
    QString::from(s)
}

fn run(qt: cxx_qt::CxxQtThread<qobject::Gamepads>, rumble: Receiver<(f32, f32, u32)>) {
    let mut gilrs = match Gilrs::new() {
        Ok(g) => g,
        Err(gilrs::Error::NotImplemented(g)) => g,
        Err(e) => {
            eprintln!("vanta-shell: controllers unavailable: {e}");
            return;
        }
    };
    let mut effects: VecDeque<(Instant, gilrs::ff::Effect)> = VecDeque::new();
    let mut held: Option<&'static str> = None;
    let mut next_repeat = Instant::now();

    let publish = |gilrs: &Gilrs, qt: &cxx_qt::CxxQtThread<qobject::Gamepads>| {
        let pads: Vec<_> = gilrs.gamepads().map(|(_, g)| (g.name().to_string(), family_of(g.vendor_id(), g.name()))).collect();
        let count = pads.len() as i32;
        let family = pads.first().map(|p| p.1).unwrap_or("xbox").to_string();
        let names = pads.iter().map(|p| p.0.clone()).collect::<Vec<_>>().join(", ");
        let _ = qt.queue(move |mut obj| {
            obj.as_mut().set_count(count);
            obj.as_mut().set_family(q(&family));
            obj.as_mut().set_names(q(&names));
        });
    };
    publish(&gilrs, &qt);

    loop {
        while let Some(ev) = gilrs.next_event_blocking(Some(Duration::from_millis(8))) {
            let fire = |name: &'static str, repeat: bool| {
                let _ = qt.queue(move |obj| obj.action(q(name), repeat));
            };
            match ev.event {
                EventType::ButtonPressed(b, _) => {
                    if let Some(a) = button_action(b) {
                        fire(a, false);
                    }
                }
                EventType::Connected => {
                    publish(&gilrs, &qt);
                    let g = gilrs.gamepad(ev.id);
                    let (name, fam) = (g.name().to_string(), family_of(g.vendor_id(), g.name()));
                    let _ = qt.queue(move |obj| obj.pad_connected(q(&name), q(fam)));
                }
                EventType::Disconnected => {
                    publish(&gilrs, &qt);
                    let name = gilrs.gamepad(ev.id).name().to_string();
                    let _ = qt.queue(move |obj| obj.pad_disconnected(q(&name)));
                }
                _ => {}
            }
        }

        // Direction from any pad: D-pad first, then the left stick.
        let mut dir = None;
        for (_, g) in gilrs.gamepads() {
            for b in [Button::DPadUp, Button::DPadDown, Button::DPadLeft, Button::DPadRight] {
                if g.is_pressed(b) {
                    dir = dpad_dir(b);
                }
            }
            if dir.is_none() {
                let (x, y) = (g.value(Axis::LeftStickX), g.value(Axis::LeftStickY));
                if x.hypot(y) > STICK {
                    // gilrs: stick up is positive Y.
                    dir = Some(if x.abs() > y.abs() { if x > 0.0 { "right" } else { "left" } } else if y > 0.0 { "up" } else { "down" });
                }
            }
        }
        let now = Instant::now();
        if dir != held {
            held = dir;
            if let Some(d) = dir {
                let _ = qt.queue(move |obj| obj.action(q(d), false));
                next_repeat = now + REPEAT_DELAY;
            }
        } else if let Some(d) = dir {
            if now >= next_repeat {
                let _ = qt.queue(move |obj| obj.action(q(d), true));
                next_repeat = now + REPEAT_RATE;
            }
        }

        // Rumble requests; finished effects are dropped once they're done.
        while let Ok((weak, strong, ms)) = rumble.try_recv() {
            let ids: Vec<GamepadId> = gilrs.gamepads().filter(|(_, g)| g.is_ff_supported()).map(|(id, _)| id).collect();
            if ids.is_empty() {
                continue;
            }
            let replay = Replay { play_for: Ticks::from_ms(ms), ..Default::default() };
            let built = EffectBuilder::new()
                .add_effect(BaseEffect { kind: BaseEffectType::Strong { magnitude: (strong * 65535.0) as u16 }, scheduling: replay, ..Default::default() })
                .add_effect(BaseEffect { kind: BaseEffectType::Weak { magnitude: (weak * 65535.0) as u16 }, scheduling: replay, ..Default::default() })
                .gamepads(&ids)
                .finish(&mut gilrs);
            if let Ok(effect) = built {
                if effect.play().is_ok() {
                    effects.push_back((now + Duration::from_millis(ms as u64 + 200), effect));
                }
            }
        }
        while effects.front().is_some_and(|(end, _)| *end < now) {
            effects.pop_front();
        }
    }
}
