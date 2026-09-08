"use client";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { type Companion } from "@/interactions/companionStateMachine";
import { RoomRuntime } from "@/interactions/roomRuntime";
import { groundToScreen } from "@/interactions/roomCoordinates";
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

export default function CompanionRoom() {
  const { preferences, store } = useRoomPreferences();
  const osDark = useMedia("(prefers-color-scheme: dark)"),
    reduced = useMedia("(prefers-reduced-motion: reduce)"),
    visible = useVisible();
  const theme = preferences.theme ?? (osDark ? "dark" : "light");
  const visiblePet: Companion = theme === "dark" ? "jew" : "bo";
  const [runtime] = useState(() => new RoomRuntime(visiblePet));
  const jew = useSyncExternalStore(
    runtime.pets.jew.machine.subscribe,
    runtime.pets.jew.machine.getSnapshot,
    runtime.pets.jew.machine.getSnapshot,
  );
  const bo = useSyncExternalStore(
    runtime.pets.bo.machine.subscribe,
    runtime.pets.bo.machine.getSnapshot,
    runtime.pets.bo.machine.getSnapshot,
  );
  const snapshots = { jew, bo };
  const [menu, setMenu] = useState(false),
    [panel, setPanel] = useState<"notes" | "about" | null>(null),
    [savedOnly, setSavedOnly] = useState(false);
  const [found, setFound] = useState<HeartMessage | null>(null),
    [noteOpen, setNoteOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    menuRef = useRef<HTMLDivElement>(null),
    menuButton = useRef<HTMLButtonElement>(null),
    noteClose = useRef<HTMLButtonElement>(null);
  const [stageSize, setStageSize] = useState({ width: 390, height: 844 });
  const [breathPhase, setBreathPhase] = useState("Breathe in");
  const snapshot = snapshots[visiblePet];
  const select = (pet: Companion) => {
    runtime.select(pet);
  };
  useEffect(() => {
    runtime.setVisiblePet(visiblePet);
  }, [runtime, visiblePet]);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setStageSize({ width: r.width, height: r.height });
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const notePoint = groundToScreen(
    runtime.noteGround.x,
    runtime.noteGround.z,
    stageSize.width,
    stageSize.height,
  );
  const notePosition = {
    left: Math.max(35, Math.min(stageSize.width - 35, notePoint.x)) + "px",
    top: Math.max(50, Math.min(stageSize.height - 65, notePoint.y)) + "px",
  };
  useEffect(() => {
    runtime.initialize(!store.getSnapshot().welcomed, (state, pet) => {
      runtime.audio.play(state, pet);
      if (["bite", "paw", "boop", "heart-note"].includes(state))
        haptic(state === "bite" ? 18 : 10);
      if (state === "heart-note") {
        const current = store.getSnapshot(),
          note = chooseMessage(pet, current.seen);
        store.update({
          seen: [...current.seen.filter((id) => id !== note.id), note.id],
        });
        runtime.setHasNote(true);
        setFound(note);
        setNoteOpen(false);
      }
    });
    const timer = setInterval(() => {
      if (!document.hidden) runtime.advance(100);
    }, 100);
    return () => {
      clearInterval(timer);
      runtime.dispose();
    };
  }, [runtime, store]);
  useEffect(() => {
    runtime.setPaused(panel !== null || noteOpen);
    if (panel) {
      runtime.cancelPointers();
      if (!dialog.current?.open) dialog.current?.showModal();
    } else if (dialog.current?.open) dialog.current.close();
  }, [panel, noteOpen, runtime]);
  useEffect(() => {
    if (noteOpen) noteClose.current?.focus({ preventScroll: true });
  }, [noteOpen, panel]);
  useEffect(() => {
    if (!stage.current) return;
    return connectPointerEngine(stage.current, runtime, () => {
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
    store.update({ theme: theme === "dark" ? "light" : "dark" });
    setMenu(false);
  };
  const closeNote = useCallback(() => {
    setFound(null);
    setNoteOpen(false);
    runtime.dismissNote();
    runtime.pets[runtime.active].anchor?.focus({ preventScroll: true });
  }, [runtime]);
  useEffect(() => {
    if (!noteOpen || panel || menu) return;
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeNote();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [noteOpen, panel, menu, closeNote]);
  const favorite = (id: string) =>
    store.update({
      favorites: preferences.favorites.includes(id)
        ? preferences.favorites.filter((value) => value !== id)
        : [...preferences.favorites, id],
    });
  const petPoint = (pet: Companion) => {
    const h = runtime.pets[pet].hits.find((hit) => hit.zone === "head");
    return h
      ? {
          x: (h.x / stageSize.width) * 2 - 1,
          y: 1 - (h.y / stageSize.height) * 2,
        }
      : { x: 0, y: 0 };
  };
  const petTap = (pet: Companion) => {
    select(pet);
    runtime.pets[pet].motion.pause(3);
    runtime.pets[pet].machine.engage("tap", "head", petPoint(pet));
    store.update({ welcomed: true });
    if (preferences.sound) runtime.audio.setEnabled(true);
  };
  const keyboard = (e: KeyboardEvent<HTMLDivElement>) => {
    if (
      e.target !== e.currentTarget &&
      !(e.target as HTMLElement).closest(".pet-target")
    )
      return;
    const selected = (e.target as HTMLElement).getAttribute(
      "data-pet",
    ) as Companion | null;
    const pet = selected ?? visiblePet,
      machine = runtime.pets[pet].machine;
    const key = e.key.toLowerCase();
    if (
      ![
        " ",
        "enter",
        "p",
        "h",
        "b",
        "escape",
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
      ].includes(key)
    )
      return;
    e.preventDefault();
    select(pet);
    runtime.pets[pet].motion.pause(3);
    const point = petPoint(pet);
    if (key === " " || key === "enter") petTap(pet);
    else if (key === "p") machine.engage("tap", "paw", point);
    else if (key === "h") machine.track(point, 0.7, true);
    else if (key === "b") machine.rest();
    else if (key === "escape") machine.cancelPointer();
    else
      machine.track({
        x: Math.max(
          -0.85,
          Math.min(
            0.85,
            machine.target.x +
              (key === "arrowright" ? 0.12 : key === "arrowleft" ? -0.12 : 0),
          ),
        ),
        y: Math.max(
          -0.85,
          Math.min(
            0.85,
            machine.target.y +
              (key === "arrowup" ? 0.12 : key === "arrowdown" ? -0.12 : 0),
          ),
        ),
      });
    store.update({ welcomed: true });
    if (preferences.sound) runtime.audio.setEnabled(true);
  };
  const status =
    snapshot.state === "breathing"
      ? breathPhase
      : snapshot.state === "bite"
        ? "Jew gives a playful nibble."
        : snapshot.state === "boop"
          ? "Bo gives you a nose boop."
          : snapshot.state === "lick"
            ? "A little kiss from Bo."
            : snapshot.state === "paw"
              ? (visiblePet === "jew" ? "Jew" : "Bo") + " offers a paw."
              : snapshot.state === "petting"
                ? (visiblePet === "jew" ? "Jew" : "Bo") + " is enjoying that."
                : "";
  const collected = (savedOnly ? preferences.favorites : preferences.seen)
    .map((id) => messages.find((n) => n.id === id))
    .filter((n): n is HeartMessage => Boolean(n))
    .reverse();
  return (
    <main
      className="room"
      data-theme={theme}
      data-companion={visiblePet}
      data-behavior={snapshot.state}
      data-reduced-motion={reduced}
    >
      <h1 className="sr-only">Jew & Bo</h1>
      <div
        ref={stage}
        className="companion-stage"
        role="group"
        aria-label={
          visiblePet === "jew" ? "Jew’s night room" : "Bo’s daylight room"
        }
        aria-describedby="room-instructions"
        tabIndex={-1}
        onKeyDown={keyboard}
      >
        <Scene
          runtime={runtime}
          pet={visiblePet}
          reduced={reduced}
          visible={visible && !panel && !noteOpen}
          dark={theme === "dark"}
        />
        <button
          key={visiblePet}
          ref={(node) => runtime.bindAnchor(visiblePet, node)}
          className="pet-target"
          data-pet={visiblePet}
          data-state={snapshot.state}
          aria-label={
            visiblePet === "jew"
              ? "Pet or drag Jew, the black cat"
              : "Pet or drag Bo, the golden retriever"
          }
          onFocus={() => select(visiblePet)}
          onClick={(event) => {
            if (event.detail === 0) petTap(visiblePet);
          }}
        />
        {["bite", "boop", "lick"].includes(snapshot.state) && (
          <span
            className={
              "contact-effect " + (visiblePet === "jew" ? "nibble" : "boop")
            }
            style={{
              left: (runtime.pets[visiblePet].machine.target.x + 1) * 50 + "%",
              top: (1 - runtime.pets[visiblePet].machine.target.y) * 50 + "%",
            }}
            aria-hidden="true"
          >
            {visiblePet === "jew" ? (
              <>
                <i />
                <i />
              </>
            ) : (
              <Icon name="heart" size={24} />
            )}
          </span>
        )}
        {snapshot.state === "digging" && (
          <div className="dig-dust" style={notePosition} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <i key={i} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
        )}
        {found && !noteOpen && (
          <button
            className="found-heart"
            style={notePosition}
            aria-label="Open the heart note"
            onClick={() => {
              setNoteOpen(true);
              haptic();
              runtime.audio.play("heart-note", found.pet);
            }}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path
                d="M50 87 13 49C-9 17 30 3 50 27 70 3 109 17 87 49Z"
                fill="#d8a99d"
              />
              <path d="m50 27 0 60 37-38C109 17 70 3 50 27Z" fill="#c5968b" />
              <path
                d="m14 49 36 14 36-14M50 27v60"
                stroke="#b9867e"
                fill="none"
              />
            </svg>
          </button>
        )}
      </div>
      <p id="room-instructions" className="sr-only">
        Jew stays with you at night and Bo stays with you in daylight. Touch or
        stroke the pet to say hello, drag to move them, or hold still to breathe
        together. Jew playfully nibbles and drops free if dragged for too long;
        Bo is happy to keep being carried. Tap the floor to invite a walk.
        Keyboard: Space to pet, P for a paw, H to play, B to breathe, and arrow
        keys to look.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      {found && noteOpen && (
        <section
          className="open-note"
          aria-label="Heart note"
          aria-live="polite"
        >
          <div className="note-top">
            <span>From {found.pet === "jew" ? "Jew" : "Bo"}</span>
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
          <button
            className="save-note icon-button"
            aria-label={
              preferences.favorites.includes(found.id)
                ? "Unsave this note"
                : "Save this note"
            }
            aria-pressed={preferences.favorites.includes(found.id)}
            onClick={() => favorite(found.id)}
          >
            <Icon name="heart" size={20} />
          </button>
        </section>
      )}
      <div className="room-controls">
        {menu && (
          <div
            ref={menuRef}
            className="settings-popover"
            aria-label="Room settings"
          >
            <button onClick={toggleTheme}>
              <Icon name={theme === "dark" ? "sun" : "moon"} />
              <span>{theme === "dark" ? "Daylight" : "Moonlight"}</span>
            </button>
            <button
              onClick={() => {
                const value = !preferences.sound;
                store.update({ sound: value });
                runtime.audio.setEnabled(value);
                if (value) runtime.audio.play("happy", visiblePet);
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
              disabled={["digging", "heart-note"].includes(snapshot.state)}
              onClick={() => {
                runtime.pets[visiblePet].motion.pause(17);
                runtime.pets[visiblePet].machine.rest();
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
              <span>Help</span>
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
          <h2 id="panel-title">
            {panel === "notes" ? "Heart Notes" : "Jew & Bo"}
          </h2>
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
            <div className="collection-tabs">
              <button
                aria-pressed={!savedOnly}
                onClick={() => setSavedOnly(false)}
              >
                Found <span>{preferences.seen.length}</span>
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
                  <Icon name="heart" size={30} />
                  <p>
                    {savedOnly
                      ? "Keep a little warmth."
                      : "Good things take a moment."}
                  </p>
                  <span>
                    {savedOnly
                      ? "Tap the heart on a note to save it."
                      : "Spend time together. They may find something for you."}
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
              Jew, a little black cat, keeps you company at night. Bo, a little
              golden retriever, joins you in daylight.
            </p>
            <p>
              Tap or stroke to say hello, drag your pet around, touch a paw, or
              hold still to breathe together. Tap the floor to invite a walk.
            </p>
            <p>
              Drag Jew for too long and he gives a tiny playful nibble, then
              drops free. Bo is happy to be carried as long as you like. They
              also dig up heart notes more often now.
            </p>
            <button
              className="system-theme"
              onClick={() => {
                store.update({ theme: null });
                setPanel(null);
              }}
            >
              Use my device’s appearance
            </button>
            <p className="keyboard-help">
              Keyboard: <kbd>Tab</kbd> to focus your pet, <kbd>Space</kbd> to pet,{" "}
              <kbd>P</kbd> for a paw, <kbd>H</kbd> to play, <kbd>B</kbd> to
              breathe, and arrows to look.
            </p>
            <p>
              Your notes stay in this browser.{" "}
              {store.persistent
                ? "Clearing browser data clears your collection."
                : "Saving is unavailable; notes will stay for this visit."}
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
