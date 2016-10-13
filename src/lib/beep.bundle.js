/*


	Beep




	Description

	  A JavaScript toolkit for building browser-based synthesizers.


*/




var Beep = {

	VERSION: 7,


	//  How much console output should we have, really?
	//  Expecting a value between 0 and 1 inclusive
	//  where 0 = nothing and 1 = everything possible.

	verbosity: 0.5,


	//  Chrome, Opera, and Firefox already provide AudioContext()
	//  but Safari instead provides webkitAudioContext().
	//  Let’s just standardize this for our own sanity right here:

	AudioContext: window.AudioContext ? window.AudioContext : window.webkitAudioContext,


	//  We’ll keep track of Voices, Triggers, and Instruments
	// (but not Notes because we just throw those away left and right)
	//  so we can access and/or teardown them later even if unnamed.

	voices:      [],
	samples:     [],
	triggers:    [],
	instruments: [],


	//  Once the “DOM Content Loaded” event fires we’ll come back
	//  and set this to either an existing DOM Element with a #beep ID
	//  or create a new element and append it to the Body.

	domContainer: null,


	//  This will be rather useful for bypassing keyboard Event Listeners.
	//  @@ Will come back and rename this / improve its functionality
	//  so that any focus on a text area stops Triggers from firing!

	isKeyboarding: true,


	//  When the system’s ready (ie. DOM content loaded, etc.)
	//  we may need to perform some setup tasks.

	setupTasks: [

		function(){

			if( Beep.audioContext === undefined ) Beep.audioContext = new Beep.AudioContext()
		},
		function(){

			if( Beep.domContainer === null ) Beep.domContainer = document.getElementById( 'beep' )
		},
		function(){

			if( Beep.verbosity > 0 ) console.log( 'Beep', Beep.VERSION )
		}
	],


	//  Right now just runs Beep.eval() but in the near future
	//  we might have some more tricks up our sleeve...

	setup: function(){

		var task

		while( task = this.setupTasks.shift() ){

			if( typeof task === 'function' ) task()
		}
	},


	//  Teardown everything. EVERYTHING. DO IT. DO IT NOW.

	teardown: function(){

		while( this.instruments.length ){

			this.instruments.pop().teardown()
		}
		while( this.triggers.length ){

			this.triggers.pop().teardown()
		}
		while( this.samples.length ){

			this.samples.pop().teardown()
		}
		while( this.voices.length ){

			this.voices.pop().teardown()
		}
	},


	//  We need to tear everything down.
	//  Then build it right back up.

	reset: function(){

		this.teardown()
		this.setup()
	},


	//  JavaScript does not natively support multiline String literals.
	//  Sure, you can construct a string and include a “\n” or “\r” and
	//  ok, I admit you can do the “\” + actual line return trick in some cases
	//  but the most reliable (and forget Internet Explorer) way is to create
	//  a function which includes multiline *comments* (OMFG!),
	//  then parse the Function literal itself as a String!

	parseMultilineString: function( f ){

		f = f.toString()

		var
		begin = f.indexOf( '/*' ) + 2,
		end   = f.indexOf( '*/', begin )

		return f.substring( begin, end ).replace( /\/\+/g, '/*' ).replace( /\+\//g, '*/' )
	}
}




//  Once our DOM Content is ready for action
//  it’s time to GIVE IT ACTION. W000000000000T !

document.addEventListener( 'DOMContentLoaded', function(){

	Beep.setup()
})

module.exports = Beep;




/*


	Beep.Note




	Requires

	  1  Beep

	Description

	  Not sounds or oscillators, but mathematical models
	  resolving to frequencies in Hertz.

	Example uses

	  note = new Beep.Note( '3eb' )
	  note = new Beep.Note.EDO12( '3eb' )
	  note = new Beep.Note.JustIntonation( 'C#3', 'C#2' )

	Roadmap

	  I knew this was complicated but it’s far moreso than I realized!
	  Need to revisit all of this in much more depth once some more
	  functionality and interface fixes have been completed:
	  https://github.com/stewdio/beep.js/issues/2
	  http://everything2.com/title/The+difference+between+tritone%252C+augmented+fourth%252C+diminished+fifth%252C+%252311+and+b5


*/




Beep.Note = function( params ){

	var that = this

 	if( typeof params === 'number' ) this.hertz = params
 	else if( typeof params === 'object' && params.hertz !== undefined ){

		Object.keys( params ).forEach( function( key ){

			that[ key ] = params[ key ]
		})
	}
	else return Beep.Note.EDO12( params )
}




//  Common Western music has 12 notes per octave,
//  lettered A through G with modifier symbols for sharps and flats.
//  Let’s build a validator for Western music:

Beep.Note.validateWestern = function( params ){

	var
	NAMES   = [ 'A♭', 'A♮', 'B♭', 'B♮', 'C♮', 'C♯', 'D♮', 'E♭', 'E♮', 'F♮', 'F♯', 'G♮' ],
	LETTERS = 'ABCDEFG',
	SHARPS  = 'CF',
	FLATS   = 'EAB',
	temp

	if( typeof params === 'undefined' ) params = {}
	else if( typeof params === 'string' ){

		temp = params
		params = {}
		temp.split( '' ).forEach( function( p, i ){

			if( +p + '' !== 'NaN' ) params.octaveIndex = +p
			else if( '♭♮♯#'.indexOf( p ) !== -1 ){

				params.modifier = p
			}
			else if(( LETTERS + 'H' ).indexOf( p.toUpperCase() ) !== -1 ){

				if( p.toUpperCase() === 'H' ) params.letter = 'B'
				else if( p === 'b' && i > 0 ) params.modifier = '♭'
				else params.letter = p.toUpperCase()
			}
		})
	}


	//  What octave is this?

	if( params.octaveIndex === undefined
		|| params.octaveIndex === ''
		|| +params.octaveIndex +'' === 'NaN' ) params.octaveIndex = 4
	params.octaveIndex = +params.octaveIndex
	if( params.octaveIndex < 0 ) params.octaveIndex = 0
	else if( params.octaveIndex > 8 ) params.octaveIndex = 8


	//  What’s this Note’s name?

	if( params.letter === undefined ) params.letter = 'A'
	params.letterIndex = LETTERS.indexOf( params.letter )
	if( params.modifier === undefined ) params.modifier = '♮'
	if( params.A === undefined ) params.A = 440.00


	//  Force the correct accidental symbols.

	if( params.modifier === 'b' ) params.modifier = '♭'
	if( params.modifier === '#' ) params.modifier = '♯'


	//  Handy function for redefining the letter
	//  when the letterIndex may have shifted.

	function setLetterByLetterIndex( params ){

		if( params.letterIndex < 0 ){

			params.letterIndex += LETTERS.length
			params.octaveIndex --
		}
		if( params.letterIndex >= LETTERS.length ){

			params.letterIndex -= LETTERS.length
			//  Next line commented out but left in as a reminder
			//  that it would cause G♯ conversion to A♭
			//  to jump up an entire octave for no good reason!
			//params.octaveIndex ++
		}
		params.letter = LETTERS.substr( params.letterIndex, 1 )
		return params
	}


	//  Force the correct sharp / flat categorization.
	//  Why does the Equal Temperament scale consider certain letters flat or sharp
	//  when they are mathematically equal?!
	//  Has to do with the delta between Equal Temperament and the Just Scale.
	//  Where Equal Temperament comes in higher than Just we call it sharp,
	//  and where it comes in lower than Just we call it flat:
	//  http://www.phy.mtu.edu/~suits/scales.html

	if( params.modifier === '♭' && FLATS.indexOf( params.letter ) === -1 ){

		params.letterIndex = LETTERS.indexOf( params.letter ) - 1
		params = setLetterByLetterIndex( params )
		if( SHARPS.indexOf( params.letter ) > -1 ) params.modifier = '♯'
		else params.modifier = '♮'
	}
	else if( params.modifier === '♯' && SHARPS.indexOf( params.letter ) === -1 ){

		params.letterIndex = LETTERS.indexOf( params.letter ) + 1
		params = setLetterByLetterIndex( params )
		if( FLATS.indexOf( params.letter ) > -1 ) params.modifier = '♭'
		else params.modifier = '♮'
	}


	//  Now that we’re certain the modifier is correct
	//  we can set convenience booleans.

	if( params.modifier === '♯' ) params.isSharp = true
	else if( params.modifier === '♭' ) params.isFlat = true
	else params.isNatural = true


	//  Is this cleanse here still necessary?

	params = setLetterByLetterIndex( params )


	//  Let’s make sure we have the .name (letter + modifier)
	//  and the .nampleSimple (letter yes, but only a modifier
	//  if unnatural) and set the .nameIndex appropriately.

	params.name = params.letter + params.modifier
	params.nameSimple = params.letter
	if( params.modifier !== '♮' ) params.nameSimple += params.modifier
	params.nameIndex = NAMES.indexOf( params.name )


	//  Final gotcha: Let’s only allow a C Natural in the 8th octave.

	if( params.octaveIndex === 8 && params.nameSimple !== 'C' ) params.octaveIndex = 7


	//  Set the .pianoKeyIndex and then the corresponding MIDI Number.

	params.pianoKeyIndex = params.octaveIndex * 12 + params.nameIndex
	if( params.nameIndex > 3 ) params.pianoKeyIndex -= 12
	params.midiNumber = params.pianoKeyIndex + 20


	//  What tuning method are we supposed to use?

	if( params.tuning === undefined ) params.tuning = 'EDO12'


	//  We now have the majority of the Note ready for use.
	//  Everything except for ... the FREQUENCY of the Note!
	//  That will be decided based on the tuning method.

	return params
}




    /////////////////
   //             //
  //   Tunings   //
 //             //
/////////////////


//  EQUAL DIVISION OF OCTAVE INTO 12 UNITS
//  -     -           -           --
//  Does exactly what it says on the tin, man.

Beep.Note.EDO12 = function( params ){

	params = Beep.Note.validateWestern( params )


	//  The Cent is a logarithmic unit of measure that divide
	//  the 12-tone equal temperament octave into 12 semitones
	//  of 100 cents each.
	//  http://en.wikipedia.org/wiki/Cent_(music)

	//   + 0¢  UNISON
	//   100¢  minor   2nd
	//   200¢  MAJOR   2nd
	//   300¢  minor   3rd
	//   400¢  MAJOR   3rd
	//   500¢  PERFECT 4th
	//   600¢  tritone
	//   700¢  PERFECT 5th
	//   800¢  minor   6th
	//   900¢  MAJOR   6th
	//  1000¢  minor   7th
	//  1100¢  MAJOR   7th
	//  1200¢  OCTAVE

	params.hertz = params.A * Math.pow( Math.pow( 2, 1 / 12 ), params.pianoKeyIndex - 49 )
	params.tuning = 'EDO12'
	return new Beep.Note( params )
}


//  The most mathematically beautiful tuning,
//  makes for sonically gorgeous experiences
//  ... Until you change keys!

Beep.Note.JustIntonation = function( params, key ){

	var
	that = this,
	relationshipIndex

	params = Beep.Note.validateWestern( params )
	params.tuning = 'JustIntonation'
	params.key = new Beep.Note.EDO12( key )


	//  This is Ptolemy’s “Intense Diatonic Scale” which is based on
	//  Pythagorean tuning. It is but one example of Just Intonation.
	//  http://en.wikipedia.org/wiki/Ptolemy%27s_intense_diatonic_scale
	//  http://en.wikipedia.org/wiki/Pythagorean_tuning
	//  http://en.wikipedia.org/wiki/List_of_pitch_intervals
	//  http://www.chrysalis-foundation.org/just_intonation.htm

	relationshipIndex = ( params.nameIndex - params.key.nameIndex ) % 12
	if( relationshipIndex < 0 ) relationshipIndex += 12
	params.hertz = [

		params.key.hertz,          //  Do  UNISON
		params.key.hertz * 16 / 15,//      minor     2nd
		params.key.hertz *  9 /  8,//  Re  MAJOR     2nd
		params.key.hertz *  6 /  5,//      minor     3rd
		params.key.hertz *  5 /  4,//  Mi  MAJOR     3rd
		params.key.hertz *  4 /  3,//  Fa  PERFECT   4th
		params.key.hertz * 45 / 32,//      augmented 4th
		params.key.hertz *  3 /  2,//  So  PERFECT   5th
		params.key.hertz *  8 /  5,//      minor     6th
		params.key.hertz *  5 /  3,//  La  MAJOR     6th
		params.key.hertz * 16 /  9,//      minor     7th (HD, baby!)
		params.key.hertz * 15 /  8,//  Ti  MAJOR     7th
		params.key.hertz *  2      //  Do  OCTAVE

	][ relationshipIndex ]


	//  If the key’s octave and our desired note’s octave were equal
	//  then we’d be done. Otherwise we’ve got to bump up or down our
	//  note by whole octaves.

	params.hertz = params.hertz * Math.pow( 2, params.octaveIndex - params.key.octaveIndex )
	return new Beep.Note( params )
}




//  Does this thing look like it could be a Note?

Beep.Note.seemsLegit = function( x ){

	var
	seemsLegit    = true,
	noteNames     = 0,
	octaveIndexes = 0,
	modifiers     = 0,
	flatOrBs      = 0,
	chr, i

	if( x instanceof Beep.Note ) return true//  Is an actual Beep.Note.
	else if( typeof x === 'number' ) return true//  Expecting this to be a Hertz value.
	else if( typeof x === 'string' ){


		//  Longest combo we expect is
		//  Note Name (1 char) +
		//  OctaveIndex (1 char, value 0–8) +
		//  Modifier (1 char, ♮♯♭#b).

		if( x.length > 3 ) return false


		//  Here are the maximum possible outcomes:
		//  octaves    1  1  1
		//  noteNames  1  1  0
		//  modifiers  1  0  1
		//  flatOrBs   0  1  1

		for( i = 0; i < x.length; i ++ ){

			chr = x[ i ]
			if( +chr + '' !== 'NaN' && +chr >= 0 && +chr <= 8 ) octaveIndexes ++
			else if( 'ABCDEFGHacdefgh'.indexOf( chr ) >= 0 ) noteNames ++
			else if( '♮♯♭#'.indexOf( chr ) >= 0 ) modifiers ++
			else if( 'b' === chr ) flatOrBs ++
			else {

				seemsLegit = false
				break
			}
		}
		//console.log( octaveIndexes, noteNames, modifiers, flatOrBs )
		if( octaveIndexes > 1 ||
			noteNames > 1 ||
			modifiers > 1 ||
			flatOrBs  > 1 ||
			noteNames + modifiers + flatOrBs > 2 ) seemsLegit = false

		return seemsLegit
	}
	else return false
}







/*


	Beep.Sample




	Requires

	  1  Beep

	Description

	  Samples are playable representations of audio files. I think?

	Example uses

	  sample = new Beep.Sample( '2legit.mp4' )

	Roadmap

	  Add support for pitch bending so one loaded sample can
	  be used in place of Note.


*/




Beep.Sample = function(){

	var a, i

	for( i = 0; i < arguments.length && i <= 3; i ++ ){

		a = arguments[ i ]


		//  If we were passed a String then
		//  it should either be a URL for an audio file
		//  or the ID for a DOM Element.

		if( typeof a === 'string' ){

			if( Beep.Sample.seemsLikeAudioFileName( a )) this.domElement = new Audio( a )
			else this.domElement = document.getElementById( a )
		}


		//  We’re also hoping for an audio connection
		//  to hook this sample up to.

		else if( a instanceof Beep.AudioContext ){

			this.audioContext = a
			this.destination  = a.destination
		}
		else if( a instanceof GainNode ){

			this.audioContext = a.audioContext
			this.destination  = a
		}
	}


	//  Contingency planning.

	if( this.domElement instanceof HTMLAudioElement === false ) this.domElement = new Audio()
	if( this.audioContext === undefined ){

		this.audioContext = new Beep.AudioContext()
		this.destination  = this.audioContext.destination
	}


	//  Config some bid-niz.
	//  Note to all you peeps running this off your desktop:
	//  By setting .crossOrigin to 'anonymous' you can load
	//  audio files from an http: or https: but NOT file: protocol.
	//  So you will NOT be able to load local files :(

	this.domElement.crossOrigin = 'anonymous'
	this.domElement.preload = 'auto'
	this.domElement.loop = 'loop'
	if( this.domElement.src === undefined ) this.domElement.src = 'https://storage.googleapis.com/chhirp-prod-aac-hdortfjlzncw/50e7eb29-a951-4757-942c-981b4c521d36.mp4'


	//  The trick is you must create a “Media Element Source”
	//  from the HTML Audio Element, and then connect that source
	//  up to the Web Audio API context. Slightly wonky.

	this.source = Beep.audioContext.createMediaElementSource( this.domElement )
	this.source.mediaElement.crossOrigin = 'anonymous'
	// this.filter = this.audioContext.createBiquadFilter()
	// this.filter.type = this.filter.LOWPASS
	// this.filter.frequency.value = 500
	// this.source.connect( this.filter )
	// this.filter.connect( this.gainNode )
	this.source.connect( this.destination )


	//  Good to know when it’s time to go home.

	this.isTorndown = false


	//  Push a reference of this instance into Beep’s library
	//  so we can access and/or teardown it later.

	Beep.samples.push( this )
}




Beep.Sample.seemsLikeAudioFileName = function( s ){

	return typeof s === 'string' && s.search( /\.(aac|mp3|mp4|ogg|webm|wav)(\?.*|)$/ ) >= 0
}




Beep.Sample.prototype.teardown = function(){

	if( this.isTorndown === false ){

		this.source.disconnect()
		this.isTorndown = true
	}
	return this
}







/*


	Beep.Voice




	Requires

	  1  Beep
	  2  Beep.Note
	  3  Beep.Sample

	Description

	  If a Note is merely a mathematical model then Voices are where
	  the rubber meets the road. Voices contain a Note and an oscillator
	  so a Voice is a thing that can actually sing!

	  If our Instruments were monophonic then we’d only need one voice
	  that could be re-used to play any Note.
	  But we’re polyphonic -- we can play multiple notes at once!

	  Sending no arguments to a Voice will give you all default params
	  and results in a playable Concert A.

	  The intended use here is to create a Voice, optionally passing it
	  a Note to begin with, and then alter its Note dynamically in a loop.
	  Example: gliding from a Concert A to one octave lower could involve
	  creating a Voice with no Note argument, calling its play() method,
	  then from within a loop assign the Voice a new progressively lower
	  Note per loop until desired.

	Example uses

	  voice = new Beep.Voice( 'eb3' )
	  voice.play()
	  setTimeout( function(){ voice.pause() }, 500 )

	  voice = new Beep.Voice( '3E♭' ) //  Equivalent to above.
	    .setOscillatorType( 'square' )//  For that chunky 8-bit sound.
	    .setAttackGain( 0.3 )         //  0 = No gain. 1 = Full gain.
	    .setAttackDuration( 0.08 )    //  Attack ramp up duration in seconds.
	    .setDecayDuration( 0.1 )      //  Decay ramp down duration in seconds.
	    .setSustainGain( 0.6 )        //  Sustain gain level; percent of attackGain.
	    .setSustainDuration( 1 )      //  Sustain duration in seconds -- normally Infinity.
	    .setReleaseDuration( 0.1 )    //  Release ramp down duration in seconds.
	    .play( 0.5 )                  //  Optionally multiply the attack and sustain gains.


*/




//  We’re expecting up to two kinds of optional arguments:
//  a note-like thing and an audio-connection-like thing.
//  We can handle several permutations of this.
//  There’s a hardware limitation of 6 Audio Contexts in total
//  so we’d like to connect this Voice to an existing one if
//  possible. But if need be we can create a new one here.

Beep.Voice = function( a, b ){


	//  Remember the ? will be validated by Note()
	//  so it could be an Object, String, Number, etc.
	//
	//      ( AudioContext, Note )
	//      ( AudioContext, ?    )
	//      ( GainNode,     Note )
	//      ( GainNode,     ?    )

	if( a instanceof Beep.AudioContext || a instanceof GainNode ){

		if( a instanceof Beep.AudioContext ){

			this.audioContext = a
			this.destination  = a.destination
		}
		else if( a instanceof GainNode ){

			this.audioContext = a.audioContext
			this.destination  = a
		}
		if( b instanceof Beep.Note ) this.note = b
		else this.note = new Beep.Note( b )//  Still ok if b === undefined.
	}


	//  Again, the ? will be validated by Note()
	//  so it could be an Object, String, Number, etc.
	//
	//      ( Note               )
	//      ( Note, AudioContext )
	//      ( Note, GainNode     )
	//      ( ?                  )
	//      ( ?,    AudioContext )
	//      ( ?,    GainNode     )

	else {

		if( a instanceof Beep.Note ) this.note = a
		else this.note = new Beep.Note( a )//  Still ok if a === undefined.
		if(  b instanceof Beep.AudioContext ){

			this.audioContext = b
			this.destination  = b.destination
		}
		else if( b instanceof GainNode ){

			this.audioContext = b.audioContext
			this.destination  = b
		}
		else {

			this.audioContext = Beep.audioContext
			this.destination  = this.audioContext.destination
		}
	}


	//  Now that we have a handle on what the arguments were
	//  we can run a setup() function. Why make that a separate
	//  function? So Beep.Sample can re-use it when it inherits
	//  Voice’s prototypes!

	this.setup()


	//  Push a reference of this instance into Beep’s library
	//  so we can access and/or teardown it later.

	Beep.voices.push( this )
}




Beep.Voice.prototype.setup = function(){


	//  Create a Gain Node
	//  for turning this voice up and down.

	this.gainNode = this.audioContext.createGain()
	this.gainNode.gain.value = 0
	this.gainNode.connect( this.destination )


	/*


	                    D + ADSR Envelope

	  ┌───────┬────────┬───────┬─────────────────┬─────────┐
	  │ Delay │ Attack │ Decay │     Sustain     │ Release │
	  │                                                    │  ↑
	  │               •••                                  │
	  │             ••   •••                               │  G
	  │           ••        •••                            │  A
	  │          •             •••••••••••••••••••         │  I
	  │         •                                 •        │  N
	  │        •                                   •••     │
	  └••••••••────────┴───────┴─────────────────┴────•••••┘

	                          TIME →


	ADSR stands for Attack, Decay, Sustain, and Release. These are all units
	of duration with the exception of Sustain which instead represents gain
	rather than time. That exception can easily become a point of confusion,
	particularly in this context where you may wish to script the duration of
	Sustain! For that reason I have named these variables rather verbosely.
	Additionally I’ve added a Delay duration. For more useful information see
	http://en.wikipedia.org/wiki/Synthesizer#ADSR_envelope

	@@ TO-DO: Support Bezier curves?

	*/
	this.delayDuration   = 0.00
	this.attackGain      = 0.15//  Absolute value between 0 and 1.
	this.attackDuration  = 0.05
	this.decayDuration   = 0.05
	this.sustainGain     = 0.80//  Percetage of attackGain.
	this.sustainDuration = Infinity
	this.releaseDuration = 0.10


	//  Because of “iOS reasons” we cannot begin playing a sound
	//  until the user has tripped an event.
	//  So we’ll use this boolean to trip this.oscillator.start(0)
	//  on the first use of this Voice instance.

	this.isPlaying = false


	//  Create an Oscillator
	//  for generating the sound.

	this.noteEnabled = true
	this.oscillator = this.audioContext.createOscillator()
	this.oscillator.connect( this.gainNode )
	this.oscillator.type = 'sine'
	this.oscillator.frequency.value = this.note.hertz


	//  @@  NEW FEATURE TK SOON ;)

	this.sampleEnabled = false


	//  Good to know when it’s time to go home.

	this.isTorndown = false
}




//  Voices are *always* emitting, so “playing” a Note
//  is really a matter of turning its amplitude up.

Beep.Voice.prototype.play = function( velocity ){

	var
	that    = this,
	timeNow = this.audioContext.currentTime,
	gainNow = this.gainNode.gain.value


	//  Optionally accept a velocity (expecting a value 0 through 1)
	//  to be multiplied against the attack and sustain gains.

	if( typeof velocity !== 'number' ) velocity = 0.5


	//  Just in case we’ve changed the value of Note
	//  since initialization.

	if( this.noteEnabled ) this.oscillator.frequency.value = this.note.hertz


	//  We might be playing a sample instead of a Note.

	if( this.sampleEnabled ){

		if( this.sampleResetOnPlay ) this.sample.currentTime = 0
		this.sample.play()
	}


	//  Cancel all your plans.
	//  And let’s tween from the current gain value.

	this.gainNode.gain.cancelScheduledValues( timeNow )
	this.gainNode.gain.setValueAtTime( gainNow, timeNow )


	//  Is there a Delay between when we trigger the Voice and when it Attacks?

	if( this.delayDuration ) this.gainNode.gain.setValueAtTime( gainNow, timeNow + this.delayDuration )


	//  Now let’s schedule a ramp up to full gain for the Attack
	//  and then down to a Sustain level after the Decay.

	this.gainNode.gain.linearRampToValueAtTime(

		velocity * this.attackGain,
		timeNow + this.delayDuration + this.attackDuration
	)
	this.gainNode.gain.linearRampToValueAtTime(

		velocity * this.attackGain * this.sustainGain,
		timeNow + this.delayDuration + this.attackDuration + this.decayDuration
	)


	//  Oh, iOS. This “wait to play” shtick is for you.

	if( this.isPlaying === false ){

		this.isPlaying = true
		if( this.noteEnabled ) this.oscillator.start( 0 )
	}


	//  Did we set a duration limit on this	Voice?

	if( this.sustainDuration !== Infinity ) setTimeout( function(){

		that.pause()

	}, timeNow + this.delayDuration + this.attackDuration + this.sustainDuration * 1000 )


	return this
}


//  We don’t want to stop() an oscillator because that would teardown it:
//  They are not reusable.
//  Instead we just turn its amplitude down so we can’t hear it.

Beep.Voice.prototype.pause = function(){

	var timeNow = this.audioContext.currentTime


	//  Cancel all your plans.
	//  And let’s tween from the current gain value.

	this.gainNode.gain.cancelScheduledValues( timeNow )
	this.gainNode.gain.setValueAtTime( this.gainNode.gain.value, timeNow )


	//  Now let’s schedule a ramp down to zero gain for the Release.

	this.gainNode.gain.linearRampToValueAtTime( 0.0001, timeNow + this.releaseDuration )
	//this.gainNode.gain.exponentialRampToValueAtTime( 0.0001, timeNow + this.releaseDuration )
	this.gainNode.gain.setValueAtTime( 0, timeNow + this.releaseDuration + 0.0001 )

	return this
}


//  Or you know what? Maybe we do want to just kill it.
//  Like sawing off the branch you’re sitting on.

Beep.Voice.prototype.teardown = function(){

	if( this.isTorndown === false ){

		if( this.oscillator ){
			if( this.isPlaying ) this.oscillator.stop( 0 )// Stop oscillator after 0 seconds.
			this.oscillator.disconnect()// Disconnect oscillator so it can be picked up by browser’s garbage collector.
		}
		if( this.source ) this.source.disconnect()
		this.isTorndown = true
	}
	return this
}




//  Some convenience getters and setters.
//
//  Q: OMG, why? It’s not like we’re protecting private variables.
//     You can already directly access these properties!
//  A: Sure, sure. But by creating setters that return “this”
//     you can easily do function-chaining and never have to create
//     and set temporary variables, like this:
//
//     voices.push(
//
// 	       new Beep.Voice( this.note.hertz * 3 / 2, this.audioContext )
// 	       .setOscillatorType( 'triangle' )
// 	       .setAttackGain( 0.3 )
//     )
//
//     As for the getters, it just felt rude to create the setters
//    (thereby leading the expectation that getters would also exist)
//     without actually having getters.

;[
	'delayDuration',
	'attackGain',
	'attackDuration',
	'decayDuration',
	'sustainGain',
	'sustainDuration',
	'releaseDuration'

].forEach( function( propertyName ){

	var propertyNameCased = propertyName.substr( 0, 1 ).toUpperCase() + propertyName.substr( 1 )

	Beep.Voice.prototype[ 'get'+ propertyNameCased ] = function(){

		return this[ propertyName ]
	}
	Beep.Voice.prototype[ 'set'+ propertyNameCased ] = function( x ){

		this[ propertyName ] = x
		return this
	}
})
Beep.Voice.prototype.getOscillatorType = function(){

	return this.oscillator ? this.oscillator.type : undefined
}
Beep.Voice.prototype.setOscillatorType = function( string ){

	if( this.oscillator ) this.oscillator.type = string
	return this
}
