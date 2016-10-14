import Beep from "lib/beep.bundle.js";

export default class ScanBeep {

  ok() {
    new Beep.Voice('4D')
      .setOscillatorType('square') //  For that chunky 8-bit sound.
      .setAttackGain(0.8)           //  0 = No gain. 1 = Full gain.
      .setAttackDuration(0.1)      //  Attack ramp up duration in seconds.
      .setDecayDuration(0.1)       //  Decay ramp down duration in seconds.
      .setSustainGain(0.5)          //  Sustain gain level; percent of attackGain.
      .setSustainDuration(0.1)     //  Sustain duration in seconds -- normally Infinity.
      .setReleaseDuration(0.1)     //  Release ramp down duration in seconds.
      .play(1.3);
  }

  error() {
    var voice = new Beep.Voice('1E');

    function play() {
      voice.setOscillatorType('square') //  For that chunky 8-bit sound.
        .setAttackGain(0.8)           //  0 = No gain. 1 = Full gain.
        .setAttackDuration(0.1)      //  Attack ramp up duration in seconds.
        .setDecayDuration(0.05)       //  Decay ramp down duration in seconds.
        .setSustainGain(0.5)          //  Sustain gain level; percent of attackGain.
        .setSustainDuration(0.1)     //  Sustain duration in seconds -- normally Infinity.
        .setReleaseDuration(0.06)     //  Release ramp down duration in seconds.
        .play(4);
    }

    for (var count = 0; count < 2; count++)
      setTimeout(play, count * 400);
  }
}

