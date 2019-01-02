/*
* NI Maschine Mikro Mk2 and Komplete Kontrol S25 driver for REAPER DAW
* Read carefully the instructions in 'main.js' before proceeding
*
* REAPER Commands lists:
* https://stash.reaper.fm/oldsb/50478/REAPER_Main-Window_command-identifiers.txt
* https://stash.reaper.fm/oldsb/50479/REAPER_MIDI-Editor_command-identifiers.txt
*/

// MIDI CC map
const
    VOL_1_CC = 14,
    VOL_2_CC = 15,
    PLAY_CC = 108,
    REC_CC = 109,
    SEL_TRK_SOLO_CC = 118,
    SEL_TRK_MUTE_CC = 119,
    PREV_TRK_CC = 89,
    NEXT_TRK_CC = 91,
    MEDIA_EXPLR_CC = 87;

let
    last_transport_state = -1,
    last_out_states = [-1, -1],
    last_time_str = '',
    last_titles = [],
    last_flags = [],
    last_vols = [],
    last_pans = [],
    last_metronome = false,
    last_track_cnt = 0,
    g_inspect_tridx = -1;

let
    minvol = -100,
    maxvol = 24;

let
    outputs = null,
    outputs_by_name = {};

let sel_trk_idx = null;

// This function is called from 'main.js'
function wwr_onreply(results) {
    const ar = results.split('\n');
    for (let x = 0; x < ar.length; x++) {
        const tok = ar[x].split('\t');

        if (tok.length > 0) {
            switch (tok[0]) {
                case 'TRANSPORT':
                    if (tok.length > 4) {
                        if (tok[1] != last_transport_state) {
                            last_transport_state = tok[1];
                            on_transport_state_changed();
                        }
                    }
                    break;
                case 'NTRACK':
                    if (tok.length > 1 && tok[1] >= 0)
                        last_track_cnt = parseInt(tok[1]) + 1;
                    break;
                case 'TRACK':
                    if (tok.length > 5) {
                        const tidx = parseInt(tok[1]);

                        if (tok[3] & 2) {
                            sel_trk_idx = tidx;
                        }
                    }
                    break;
            }

        }
    }
}

// This function is called only when transport state changed. Be careful, 'wwr_onreply' is called several times
// a second, so make sure to send MIDI messages to your controller only when needed (e.g. something changed).
function on_transport_state_changed() {
    console.log('transport state changed');
    // Example of feedback from REAPER. If you hit play in REAPER the controller's play button light will respond
    if (outputs_by_name['Maschine Mikro MK2 Out']) {
        outputs_by_name['Maschine Mikro MK2 Out'].send([176, PLAY_CC, (last_transport_state & 1) > 0 ? 127 : 0]);
        outputs_by_name['Maschine Mikro MK2 Out'].send([176, REC_CC, (last_transport_state & 4) > 0 ? 127 : 0]);
    }
}

// Transport info updates on every 10ms
wwr_req_recur('TRANSPORT', 10);

// Number of tracks and track information updates on every 1000ms
wwr_req_recur('NTRACK;TRACK;', 1000);

// This function is implemented in main.js
wwr_start();

// This function is called by main.js
function init() {
    //Request midi accsess
    navigator.requestMIDIAccess().then(function (midi_access) {
        console.log('MIDI ready!');
        const inputs = midi_access.inputs.values();

        outputs = midi_access.outputs.values();

        for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
            input.value.onmidimessage = on_midi_msg;
            console.log('input:', input.value.name);
        }

        for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
            outputs_by_name[output.value.name] = output.value;
            console.log('output:', output.value.name);
        }
    }, function (msg) {
        console.log('Failed to get MIDI access - ', msg);
    });

    // Respond to MIDI messages
    function on_midi_msg(event) {
        const val = event.data[2];
        console.log(event.data);

        switch (event.data[1]) {
            case PLAY_CC:
                wwr_req(1007);
                break;
            case VOL_1_CC:
                send_trk_vol(1, val);
                break;
            case VOL_2_CC:
                send_trk_vol(2, val);
                break;
            case PREV_TRK_CC:
                send_prev_trk(sel_trk_idx);
                break;
            case NEXT_TRK_CC:
                send_next_trk(sel_trk_idx);
                break;
            case MEDIA_EXPLR_CC:
                wwr_req(50124);
                break;
            case SEL_TRK_MUTE_CC:
                wwr_req(`SET/TRACK/${sel_trk_idx}/MUTE/-1;TRACK/${sel_trk_idx}`);
                break;
            case SEL_TRK_SOLO_CC:
                wwr_req(`SET/TRACK/${sel_trk_idx}/SOLO/-1;TRACK/${sel_trk_idx}`);
                break;
            default:
                break;
        }
    }

    function send_trk_vol(trackIndex, encoderValue) {
        // My controller sends values from 0 to 127 which should map to (-inf, +12dB] in REAPER.
        // Read 'main.js' for more information. The formula is also dealing with the fact that
        // There are more numbers from -inf to 0 than from 0 to +12. It makes the encoder less jumpy.
        wwr_req(`SET/TRACK/${trackIndex}/VOL/${(encoderValue / 127) * 4 ** (encoderValue / 127)}`);
    }

    // The functions below implement cycle selection of tracks
    function send_next_trk() {
        if (sel_trk_idx == null)
            wwr_req('SET/TRACK/1}/SEL/1');
        if (sel_trk_idx >= last_track_cnt - 1)
            wwr_req(`SET/TRACK/${sel_trk_idx}/SEL/0;SET/TRACK/1/SEL/1`);
        else
            wwr_req(`SET/TRACK/${sel_trk_idx}/SEL/0;SET/TRACK/${sel_trk_idx + 1}/SEL/1`);

        // Since we are polling with frequence 1/1s, we can get inconsistent state
        // if user clicks faster than that, hence the 'wwr_req('TRACK')' - it
        // will refresh the state accordingly.
        wwr_req('TRACK');
    }

    function send_prev_trk() {
        if (sel_trk_idx == null)
            wwr_req('SET/TRACK/1}/SEL/1');
        if (sel_trk_idx <= 1)
            wwr_req(`SET/TRACK/${sel_trk_idx}/SEL/0;SET/TRACK/${last_track_cnt - 1}/SEL/1`);
        else
            wwr_req(`SET/TRACK/${sel_trk_idx}/SEL/0;SET/TRACK/${sel_trk_idx - 1}/SEL/1`);

        // Since we are polling with frequence 1/1s, we can get inconsistent state
        // if user clicks faster than that, hence the 'wwr_req('TRACK')' - it
        // will refresh the state accordingly.
        wwr_req('TRACK');
    }
}
