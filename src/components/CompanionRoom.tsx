"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { type Behavior } from "@/interactions/companionStateMachine";
import { RoomRuntime } from "@/interactions/roomRuntime";
import { connectPointerEngine } from "@/interactions/pointerEngine";
import {
  chooseMessage,
  messages,
  type HeartMessage,
} from "@/heart-notes/messages";
import { haptic } from "@/audio/softAudio";
import {
  useMedia,
  useRoomPreferences,
  useVisible,
} from "@/hooks/useRoomPreferences";

const Scene = dynamic(() => import("./CompanionScene"), {
  ssr: false,
  loading: () => (
    <div className="arrival">
      <span />
      <span />
    </div>
  ),
});
const heartPath =
  "M12 21s-8-4.8-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.2-8 11-8 11Z";
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "heart" ? (
        <path d={heartPath} />
      ) : name === "moon" ? (
        <path d="M20.4 14.6A9 9 0 019.4 3.6a9 9 0 1011 11Z" />
      ) : name === "sun" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5" />
        </>
      ) : name === "close" ? (
        <path d="m6 6 12 12M6 18 18 6" />
      ) : name === "sound" ? (
        <>
          <path d="M11 4 5 9H2v6h3l6 5Z" />
          <path d="M15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14" />
        </>
      ) : name === "mute" ? (
        <>
          <path d="M11 4 5 9H2v6h3l6 5Z" />
          <path d="m16 9 5 6m-5 0 5-6" />
        </>
      ) : name === "info" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6m0-10v.1" />
        </>
      ) : name === "breath" ? (
        <>
          <path d="M3 9h13c5 0 5-6 1-6-2 0-3 1-3 2M3 13h16c3 0 3 4 0 4M3 17h7c4 0 4 5 1 5" />
        </>
      ) : (
        <>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </>
      )}
    </svg>
  );
}
const jewStatus: Partial<Record<Behavior, string>> = {
  watching: "You have his attention.",
  curious: "Something caught his eye.",
  petting: "That is the spot.",
  happy: "A little closer now.",
  annoyed: "The tail has opinions.",
  hunting: "A very serious little hunter.",
  pounce: "Almost got you.",
  bite: "A tiny nibble. All affection.",
  release: "Your finger is free.",
  sleeping: "You can be quiet together.",
  digging: "Wait… what is under here?",
  "heart-note": "Jew found something for you.",
  paw: "A paw, just for you.",
  groom: "A little moment to himself.",
  stretch: "Room for a good stretch.",
  blink: "A slow blink means you are welcome.",
};
const boStatus: Partial<Record<Behavior, string>> = {
  watching: "Where you go, he follows.",
  curious: "The very best kind of curious.",
  petting: "His whole day just got better.",
  happy: "Happy you are here.",
  hunting: "Ready, set…",
  pounce: "Coming to say hello!",
  boop: "Boop. You have been found.",
  lick: "A little kiss from Bo.",
  release: "Still right here.",
  sleeping: "A little nap. Good company.",
  digging: "He is onto something…",
  "heart-note": "Bo brought you a little warmth.",
  paw: "Take his paw.",
  groom: "Getting comfortable.",
  stretch: "A big stretch for a little friend.",
  blink: "Hello, favorite human.",
};
export default function CompanionRoom() {
  const { preferences, store } = useRoomPreferences();
  const osDark = useMedia("(prefers-color-scheme: dark)"),
    reduced = useMedia("(prefers-reduced-motion: reduce)"),
    visible = useVisible();
  const theme = preferences.theme ?? (osDark ? "dark" : "light");
  const [runtime] = useState(() => new RoomRuntime());
  const snapshot = useSyncExternalStore(
    runtime.machine.subscribe,
    runtime.machine.getSnapshot,
    runtime.machine.getSnapshot,
  );
  const cat = snapshot.pet === "jew",
    name = cat ? "Jew" : "Bo";
  const [menu, setMenu] = useState(false),
    [panel, setPanel] = useState<"notes" | "about" | null>(null),
    [savedOnly, setSavedOnly] = useState(false);
  const [found, setFound] = useState<HeartMessage | null>(null),
    [noteOpen, setNoteOpen] = useState(false);
  const noteClose = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    menuRef = useRef<HTMLDivElement>(null),
    menuButton = useRef<HTMLButtonElement>(null);
  const [breathPhase, setBreathPhase] = useState("Breathe in");
  const [stageSize, setStageSize] = useState({ width: 390, height: 500 });
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setStageSize({ width: r.width, height: r.height });
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const sceneZoom = Math.min(stageSize.width / 3.9, stageSize.height / 3.6);
  const notePosition = {
    left: 50 + ((0.95 * sceneZoom) / stageSize.width) * 100 + "%",
    top: 50 + ((1.17 * sceneZoom) / stageSize.height) * 100 + "%",
  };
  useEffect(() => {
    runtime.initialize(!store.getSnapshot().welcomed, (state) => {
      runtime.audio.play(state, runtime.machine.getSnapshot().pet);
      if (["bite", "paw", "boop", "heart-note"].includes(state))
        haptic(state === "bite" ? 18 : 10);
      if (state === "heart-note") {
        const current = store.getSnapshot(),
          note = chooseMessage(runtime.machine.getSnapshot().pet, current.seen);
        store.update({
          seen: [...current.seen.filter((id) => id !== note.id), note.id],
        });
        runtime.setHasNote(true);
        setFound(note);
        setNoteOpen(false);
      }
    });
    const timer = setInterval(() => {
      if (document.hidden || runtime.paused) return;
      runtime.machine.advance(100);
      if (
        runtime.scheduler.advance(
          100,
          runtime.machine.engagement,
          runtime.machine.canDiscover() && !runtime.hasNote,
        )
      )
        runtime.machine.dig();
    }, 100);
    return () => {
      clearInterval(timer);
      runtime.dispose();
    };
  }, [runtime, store]);
  useEffect(() => {
    runtime.setPaused(panel !== null);
    if (panel) {
      runtime.machine.cancelPointer();
      if (!dialog.current?.open) dialog.current?.showModal();
    } else if (dialog.current?.open) dialog.current.close();
  }, [panel, runtime]);
  useEffect(() => {
    if (noteOpen) noteClose.current?.focus({ preventScroll: true });
  }, [noteOpen, panel]);
  useEffect(() => {
    const desired = theme === "dark" ? "jew" : "bo";
    runtime.machine.switchPet(desired);
  }, [theme, runtime]);
  useEffect(() => {
    if (!stage.current) return;
    return connectPointerEngine(stage.current, runtime.machine, () => {
      store.update({ welcomed: true });
      if (store.getSnapshot().sound) runtime.audio.setEnabled(true);
      setMenu(false);
    });
  }, [runtime, store]);
  useEffect(() => {
    if (!menu) return;
    const outside = (e: PointerEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !menuButton.current?.contains(e.target as Node)
      )
        setMenu(false);
    };
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [menu]);
  useEffect(() => {
    if (snapshot.state !== "breathing") return;
    const timer = setInterval(
      () =>
        setBreathPhase(
          Math.floor(
            (runtime.machine.clock - runtime.machine.getSnapshot().since) /
              4000,
          ) %
            2 ===
            0
            ? "Breathe in"
            : "Breathe out",
        ),
      200,
    );
    return () => clearInterval(timer);
  }, [snapshot.state, runtime]);
  const toggleTheme = () => {
    if (found) {
      setFound(null);
      setNoteOpen(false);
      runtime.setHasNote(false);
      runtime.machine.dismissNote();
    }
    store.update({ theme: theme === "dark" ? "light" : "dark" });
    setMenu(false);
  };
  const closeNote = () => {
    setFound(null);
    setNoteOpen(false);
    runtime.setHasNote(false);
    runtime.machine.dismissNote();
    stage.current?.focus({ preventScroll: true });
  };
  const favorite = (id: string) =>
    store.update({
      favorites: preferences.favorites.includes(id)
        ? preferences.favorites.filter((value) => value !== id)
        : [...preferences.favorites, id],
    });
  const keyboard = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      runtime.machine.engage("tap", "head", { x: 0, y: 0.3 });
      store.update({ welcomed: true });
    } else if (e.key.toLowerCase() === "p") {
      runtime.machine.engage("tap", "paw", { x: -0.2, y: -0.4 });
      store.update({ welcomed: true });
    } else if (e.key.toLowerCase() === "h") {
      runtime.machine.track({ x: 0.28, y: 0.15 }, 0.7, true);
      store.update({ welcomed: true });
    } else if (e.key.toLowerCase() === "b") runtime.machine.rest();
    else if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const p = runtime.machine.target;
      runtime.machine.track({
        x: Math.max(
          -0.8,
          Math.min(
            0.8,
            p.x +
              (e.key === "ArrowRight"
                ? 0.12
                : e.key === "ArrowLeft"
                  ? -0.12
                  : 0),
          ),
        ),
        y: Math.max(
          -0.8,
          Math.min(
            0.8,
            p.y +
              (e.key === "ArrowUp" ? 0.12 : e.key === "ArrowDown" ? -0.12 : 0),
          ),
        ),
      });
    } else if (e.key === "Escape") runtime.machine.cancelPointer();
    if (preferences.sound) runtime.audio.setEnabled(true);
  };
  const status =
    snapshot.state === "breathing"
      ? breathPhase
      : ((cat ? jewStatus : boStatus)[snapshot.state] ??
        (cat
          ? "No rush. He is right here."
          : "A little sunshine, just for you."));
  const noteIds = savedOnly ? preferences.favorites : preferences.seen;
  const collected = noteIds
    .map((id) => messages.find((n) => n.id === id))
    .filter((n): n is HeartMessage => Boolean(n))
    .reverse();
  const contact = ["bite", "boop", "lick"].includes(snapshot.state);
  return (
    <main
      className="room"
      data-theme={cat ? "dark" : "light"}
      data-behavior={snapshot.state}
      data-companion={snapshot.pet}
      data-reduced-motion={reduced}
    >
      <div className="room-light" aria-hidden="true" />
      <div className="window-light" aria-hidden="true">
        <i />
        <i />
      </div>
      <div className="sky-object" aria-hidden="true" />
      <div className="floor" aria-hidden="true" />
      <header className="room-header">
        <Link href="/" className="wordmark" aria-label="Jew and Bo home">
          Jew <span>&</span> Bo<span className="wordmark-dot">.</span>
        </Link>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={
            cat
              ? "Switch to light mode and meet Bo"
              : "Switch to dark mode and meet Jew"
          }
        >
          <Icon name={cat ? "sun" : "moon"} />
          <span>Meet {cat ? "Bo" : "Jew"}</span>
        </button>
      </header>
      <div className="room-intro" aria-hidden="true">
        <p className="eyebrow">{cat ? "THE QUIET HOURS" : "A LITTLE WARMTH"}</p>
        <h1>
          {cat ? (
            <>
              Stay a little.
              <br />
              <em>The world can wait.</em>
            </>
          ) : (
            <>
              Hello, you.
              <br />
              <em>There is room for you.</em>
            </>
          )}
        </h1>
      </div>
      <div
        ref={stage}
        className="companion-stage"
        role="group"
        aria-roledescription="interactive companion"
        aria-label={
          name +
          " the " +
          (cat ? "black cat" : "golden retriever") +
          ". Touch to pet, drag to play, or hold to rest. Keyboard: Space to pet, P for paw, H to play, B to breathe, arrow keys to look."
        }
        tabIndex={0}
        onKeyDown={keyboard}
      >
        <Scene
          machine={runtime.machine}
          snapshot={snapshot}
          reduced={reduced}
          visible={visible && !panel}
        />
        {snapshot.state === "sleeping" && (
          <span className="sleep-marks" aria-hidden="true">
            z <small>z</small>
          </span>
        )}
        {snapshot.state === "breathing" && (
          <div className="breathing-orbit" aria-hidden="true" />
        )}
        {snapshot.state === "digging" && (
          <div className="dig-dust" style={notePosition} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <i key={i} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
        )}
        {contact && (
          <span
            className={"contact-effect " + (cat ? "nibble" : "boop")}
            style={{
              left: (runtime.machine.target.x + 1) * 50 + "%",
              top: (1 - runtime.machine.target.y) * 50 + "%",
            }}
            aria-hidden="true"
          >
            {cat ? (
              <>
                <i />
                <i />
              </>
            ) : (
              <Icon name="heart" size={27} />
            )}
          </span>
        )}
        {found && !noteOpen && (
          <button
            className="found-heart"
            style={notePosition}
            aria-label="Open the heart note"
            onClick={() => {
              setNoteOpen(true);
              haptic();
              runtime.audio.play("heart-note", snapshot.pet);
            }}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path
                d="M50 87 13 49C-9 17 30 3 50 27 70 3 109 17 87 49Z"
                fill="#e8c9ad"
              />
              <path d="m50 27 0 60 37-38C109 17 70 3 50 27Z" fill="#d8b49e" />
              <path
                d="m14 49 36 14 36-14M50 27v60"
                stroke="#c19a89"
                fill="none"
              />
              <circle cx="50" cy="60" r="8" fill="#bb807d" />
              <path
                d="M50 64s-6-3-5-6c1-3 5-2 5 0 1-2 5-3 6 0 0 3-6 6-6 6"
                fill="#f3d9c4"
              />
            </svg>
            <span>A little something</span>
          </button>
        )}
      </div>
      {found && noteOpen && (
        <section
          className="open-note"
          aria-label="Heart note"
          aria-live="polite"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeNote();
          }}
        >
          <div className="note-top">
            <span>A LITTLE NOTE FROM {found.pet === "jew" ? "JEW" : "BO"}</span>
            <button
              ref={noteClose}
              className="icon-button"
              aria-label="Close heart note"
              onClick={closeNote}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <p>{found.text}</p>
          <div className="note-bottom">
            <span>With you, softly.</span>
            <button
              className="save-note"
              aria-label={
                preferences.favorites.includes(found.id)
                  ? "Unsave this note"
                  : "Save this note"
              }
              aria-pressed={preferences.favorites.includes(found.id)}
              onClick={() => favorite(found.id)}
            >
              <Icon name="heart" size={18} />
              {preferences.favorites.includes(found.id) ? "Saved" : "Keep this"}
            </button>
          </div>
        </section>
      )}
      <div
        className={"companion-caption " + (noteOpen ? "caption-hidden" : "")}
      >
        <span className="name-label">
          {name}
          <span>
            {cat ? "your night companion" : "your sunshine companion"}
          </span>
        </span>
        <p className="status-text" role="status" aria-live="polite">
          {preferences.welcomed ? status : cat ? "Touch Jew." : "Say hi to Bo."}
        </p>
        {!preferences.welcomed && (
          <span className="touch-hint" aria-hidden="true">
            <span />
          </span>
        )}
      </div>
      <footer className="room-footer">
        <span className="quiet-signature">
          a little company. <span>nothing to earn.</span>
        </span>
        <div className="room-controls">
          {menu && (
            <div
              ref={menuRef}
              className="settings-popover"
              aria-label="Room settings"
            >
              <button onClick={toggleTheme}>
                <Icon name={cat ? "sun" : "moon"} />
                <span>{cat ? "Morning with Bo" : "Night with Jew"}</span>
              </button>
              <button
                onClick={() => {
                  const value = !preferences.sound;
                  store.update({ sound: value });
                  runtime.audio.setEnabled(value);
                  if (value) runtime.audio.play("happy", snapshot.pet);
                }}
                aria-pressed={preferences.sound}
              >
                <Icon name={preferences.sound ? "sound" : "mute"} />
                <span>Sound</span>
                <small>{preferences.sound ? "On" : "Off"}</small>
              </button>
              <button
                onClick={() => {
                  setPanel("notes");
                  setMenu(false);
                }}
              >
                <Icon name="heart" />
                <span>Heart Notes</span>
                {preferences.seen.length > 0 && (
                  <small>{preferences.seen.length}</small>
                )}
              </button>
              <button
                disabled={["leaving", "digging", "heart-note"].includes(
                  snapshot.state,
                )}
                onClick={() => {
                  runtime.machine.rest();
                  setMenu(false);
                  store.update({ welcomed: true });
                }}
              >
                <Icon name="breath" />
                <span>Breathe together</span>
              </button>
              <button
                onClick={() => {
                  setPanel("about");
                  setMenu(false);
                }}
              >
                <Icon name="info" />
                <span>About this little room</span>
              </button>
            </div>
          )}
          <button
            ref={menuButton}
            className="menu-button"
            aria-label="Room settings"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Icon name={menu ? "close" : "more"} />
          </button>
        </div>
      </footer>
      <dialog
        ref={dialog}
        className="collection-dialog"
        onCancel={() => setPanel(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              setPanel(null);
          }
        }}
        aria-labelledby="panel-title"
      >
        <div className="panel-header">
          <div>
            <p className="eyebrow">
              {panel === "notes"
                ? "SMALL THINGS, SAFELY KEPT"
                : "A PLACE TO PAUSE"}
            </p>
            <h2 id="panel-title">
              {panel === "notes" ? "Heart Notes" : "Jew & Bo"}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close panel"
            onClick={() => setPanel(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        {panel === "notes" ? (
          <>
            <p className="panel-lead">Little words. A little warmth.</p>
            <div className="collection-tabs">
              <button
                aria-pressed={!savedOnly}
                onClick={() => setSavedOnly(false)}
              >
                All found <span>{preferences.seen.length}</span>
              </button>
              <button
                aria-pressed={savedOnly}
                onClick={() => setSavedOnly(true)}
              >
                Saved <span>{preferences.favorites.length}</span>
              </button>
            </div>
            <div className="collected-notes">
              {collected.length === 0 ? (
                <div className="empty-collection">
                  <Icon name="heart" size={34} />
                  <p>
                    {savedOnly
                      ? "Keep a note that feels like yours."
                      : "Some lovely things take a little time."}
                  </p>
                  <span>
                    {savedOnly
                      ? "Tap the heart on an open note."
                      : "Spend a moment with Jew or Bo. They sometimes find something for you."}
                  </span>
                </div>
              ) : (
                collected.map((note) => (
                  <button
                    className="collected-note"
                    key={note.id}
                    onClick={() => {
                      setFound(note);
                      setNoteOpen(true);
                      runtime.setHasNote(true);
                      setPanel(null);
                    }}
                  >
                    <p>{note.text}</p>
                    <span>
                      From {note.pet === "jew" ? "Jew" : "Bo"}
                      {preferences.favorites.includes(note.id) && (
                        <Icon name="heart" size={14} />
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="about-copy">
            <p>
              A black cat for the quiet hours. A golden retriever for a little
              sunshine. No scores, no streaks. Just a small companion, happy to
              share a moment.
            </p>
            <h3>Get a little closer</h3>
            <p>
              Tap their head to say hello. Stroke slowly to pet them, or touch a
              paw. Move quickly nearby to invite a little mischief. Hold still
              with a finger down to breathe together.
            </p>
            <p>
              Jew occasionally gives a playful nibble. Bo prefers a nose-boop or
              a little kiss. Sometimes, they find a Heart Note hidden in the
              floor.
            </p>
            <h3>Make yourself comfortable</h3>
            <button
              className="system-theme"
              onClick={() => {
                store.update({ theme: null });
                setPanel(null);
              }}
            >
              Follow my device’s day / night setting
            </button>
            <p className="keyboard-help">
              Keyboard: focus your companion, then <kbd>Space</kbd> to pet,{" "}
              <kbd>P</kbd> for a paw, <kbd>H</kbd> to play, <kbd>B</kbd> to
              breathe, and arrow keys to look around.
            </p>
            <p>
              Your notes and preferences stay in this browser. No account or
              tracking.{" "}
              {store.persistent
                ? "Clearing browser data clears your collection."
                : "This browser is not allowing saves; your collection will last for this visit."}
            </p>
          </div>
        )}
        <p className="care-note">
          Jew & Bo offers gentle encouragement and companionship. It is not a
          substitute for professional mental health care.
        </p>
      </dialog>
    </main>
  );
}
