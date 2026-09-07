import { CompanionMachine, type Behavior } from "./companionStateMachine";
import { HeartScheduler } from "../heart-notes/scheduler";
import { SoftAudio } from "../audio/softAudio";
// This service owns the mutable animation clock outside React render state.
export class RoomRuntime {
  readonly machine = new CompanionMachine("bo");
  readonly audio = new SoftAudio();
  scheduler = new HeartScheduler(true);
  paused = false;
  hasNote = false;
  initialize(firstSession: boolean, onEffect: (state: Behavior) => void) {
    this.scheduler = new HeartScheduler(firstSession);
    this.machine.onEffect = onEffect;
  }
  setPaused(value: boolean) {
    this.paused = value;
  }
  setHasNote(value: boolean) {
    this.hasNote = value;
  }
  dispose() {
    this.machine.onEffect = undefined;
    this.audio.dispose();
  }
}
