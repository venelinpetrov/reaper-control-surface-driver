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
    VOL_3_CC = 16,
    VOL_4_CC = 17,
    VOL_5_CC = 18,
    VOL_6_CC = 19,
    VOL_7_CC = 20,
    VOL_8_CC = 21,
    PLAY_CC = 108,
    REC_CC = 109,
    SEL_TRK_SOLO_CC = 118,
    SEL_TRK_MUTE_CC = 119,
    PREV_TRK_CC = 89,
    NEXT_TRK_CC = 91,
    MEDIA_EXPLR_CC = 87;

let
    last_transport_state = -1,
    sel_trk_idx = null
    last_track_cnt = 0;
    prev_trk_idx = -1;

let
    outputs = null,
    outputs_by_name = {};

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
                            if (prev_trk_idx != sel_trk_idx) {
                                outputs_by_name['Maschine Mikro MK2 Out'].send([176, 118, (tok[3] & 16) > 0 ? 127 : 0]);
                                outputs_by_name['Maschine Mikro MK2 Out'].send([176, 119, (tok[3] & 8) > 0 ? 127 : 0]);
                                prev_trk_idx = tidx;
                                console.log('idx:', tidx)
                            }
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
wwr_req_recur('NTRACK;TRACK;', 100);

// This function is implemented in main.js
wwr_start();

// This function is called by maschine_driver.html
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
        const cc = event.data[1];
        const val = event.data[2];

        console.log(event.data);

        switch (cc) {
            case 115:
                // The Command ID of a custom action that toggles the FX rack
                wwr_req('_dabc7267fcf7854e80a59865f2e6c261');
                break;
            case PLAY_CC:
                // The play button is a toggle button, so when it is
                // in active state pause the mix, otherwise play it
                if (last_transport_state & 1 > 0) {
                    wwr_req(1008); // 1008 is pause, 1016 is stop if you prefer
                } else {
                    wwr_req(1007);
                }
                break;
            case VOL_1_CC:
                send_trk_vol(1, val);
                break;
            case VOL_2_CC:
                send_trk_vol(2, val);
                break;
            case VOL_3_CC:
                send_trk_vol(3, val);
                break;
            case VOL_4_CC:
                send_trk_vol(4, val);
                break;
            case VOL_5_CC:
                send_trk_vol(5, val);
                break;
            case VOL_6_CC:
                send_trk_vol(6, val);
                break;
            case VOL_7_CC:
                send_trk_vol(7, val);
                break;
            case VOL_8_CC:
                send_trk_vol(8, val);
                break;
            case PREV_TRK_CC:
                wwr_req(40286);
                wwr_req('TRACK');
                break;
            case NEXT_TRK_CC:
                wwr_req(40285);
                wwr_req('TRACK');
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
}
