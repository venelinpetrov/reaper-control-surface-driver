
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

var last_transport_state = -1, last_out_states = [-1, -1], last_time_str = "",
    last_titles = [], last_flags = [], last_vols = [], last_pans = [],
    last_metronome = false, last_track_cnt = 0,
    g_inspect_tridx = -1;

var minvol = -100, maxvol = 24;

let sel_trk_idx = 0;

function setTextForObject(obj, text) { // thx cfillion
    if (obj.lastChild) obj.lastChild.nodeValue = text;
    else obj.appendChild(document.createTextNode(text));
}

function mouseDownEventHandler(msg) {
    return function (e) {
        if (typeof e == 'undefined') e = event;
        if (e.preventDefault) e.preventDefault();
        wwr_req(msg);
        return false;
    }
}

function wwr_onreply(results) {
    var ar = results.split("\n");
    for (var x = 0; x < ar.length; x++) {
        var tok = ar[x].split("\t");
        if (tok.length > 0) switch (tok[0]) {
            case "TRANSPORT":
                if (tok.length > 4) {
                    if (tok[1] != last_transport_state) {
                        last_transport_state = tok[1];
                        if (g_outputs_by_name["Maschine Mikro MK2 Out"]) {
                            g_outputs_by_name["Maschine Mikro MK2 Out"].send([176, PLAY_CC, (last_transport_state & 1) > 0 ? 127 : 0]);
                            g_outputs_by_name["Maschine Mikro MK2 Out"].send([176, REC_CC, (last_transport_state & 4) > 0 ? 127 : 0]);
                        }
                        document.getElementById("play").style.background = (last_transport_state & 1) ? "#0f0" : "#fff";
                        document.getElementById("rec").style.background = (last_transport_state & 4) ? "#f33" : "#fff";
                    }
                    var obj = document.getElementById("status");
                    if (obj) {
                        var tmp = "";
                        switch (parseInt(last_transport_state)) {
                            case 0: tmp += "stopped: "; break;
                            case 1: tmp += "playing: "; break;
                            case 2: tmp += "paused: "; break;
                            case 5: tmp += "recording: "; break;
                            case 6: tmp += "recpaused: "; break;
                        }

                        tmp += (last_time_str = tok[4]);
                        setTextForObject(obj, tmp);
                    }
                }
                break;
            case "CMDSTATE":
                if (tok[1] == 40364) {
                    if ((tok[2] > 0) != last_metronome) {
                        last_metronome = tok[2] > 0;
                        if (g_inspect_tridx == 0)
                            document.getElementById("trackinspect_clone").style.background = last_metronome ? "#8f8" : "#777";
                    }
                }
                break;
            case "SEND":
                if (tok.length > 3) {
                    var sendidx = parseInt(tok[2]);
                    if (tok[1] == 0 && (sendidx == 0 || sendidx == 1)) {
                        if ((tok[3] & 8) != last_out_states[sendidx]) {
                            var host = document.getElementById("tracks").rows[0];
                            if (host) host.cells[1 + sendidx].style.background = (last_out_states[sendidx] = (tok[3] & 8)) ? "#88f" : "#fff";
                            if (g_inspect_tridx == 0) {
                                if (sendidx == 0)
                                    document.getElementById("trackinspect_arm").style.background = last_out_states[sendidx] ? "#88f" : "#fff";
                                else
                                    document.getElementById("trackinspect_mon").style.background = last_out_states[sendidx] ? "#88f" : "#fff";
                            }
                        }
                    }
                }
                break;
            case "NTRACK":
                if (tok.length > 1 && tok[1] >= 0) {
                    var host = document.getElementById("tracks");
                    if (host) {
                        last_track_cnt = parseInt(tok[1]) + 1;
                        var l = host.rows.length;
                        while (l > last_track_cnt) host.deleteRow(--l);
                    }
                }
                break;
            case "TRACK":
                if (tok.length > 5) {
                    var host = document.getElementById("tracks");
                    var tidx = parseInt(tok[1]);
                    if (tok[3] & 2) {
                        sel_trk_idx = tidx;
                    }
                    if (host && tidx < 200) {
                        var addtop = host.rows.length;
                        while (addtop <= tidx) {
                            var row = host.insertRow(addtop);
                            last_titles[addtop] = null;
                            last_flags[addtop] = null;
                            last_vols[addtop] = null;
                            last_pans[addtop] = null;

                            var cell = row.insertCell(0);
                            cell.className = "tracklbl";
                            cell.onmousedown = inspect_track_handler(addtop);

                            cell.appendChild(document.createElement('div'));
                            var div = document.createElement('div');
                            div.className = "trackinfo";
                            cell.appendChild(div);

                            cell = row.insertCell(1);
                            cell.className = "trackbut";
                            if (addtop > 0) {
                                cell.innerHTML = "arm";
                                cell.onmousedown = mouseDownEventHandler("SET/TRACK/" + addtop + "/RECARM/-1;TRACK/" + addtop);
                            } else {
                                cell.innerHTML = "main<br>out";
                                cell.onmousedown = mouseDownEventHandler("SET/TRACK/0/SEND/0/MUTE/-1;GET/TRACK/0/SEND/0");
                            }

                            cell = row.insertCell(2);
                            cell.className = "trackbut";
                            if (addtop > 0) {
                                cell.innerHTML = "mon";
                                cell.onmousedown = mouseDownEventHandler("SET/TRACK/" + addtop + "/RECMON/-1;TRACK/" + addtop);
                            } else {
                                cell.innerHTML = "aux<br>out";
                                cell.onmousedown = mouseDownEventHandler("SET/TRACK/0/SEND/1/MUTE/-1;GET/TRACK/0/SEND/1");
                            }

                            cell = row.insertCell(3);
                            cell.className = "trackbut";
                            cell.innerHTML = "mute";
                            cell.onmousedown = mouseDownEventHandler("SET/TRACK/" + addtop + "/MUTE/-1;TRACK/" + addtop);

                            addtop++;
                        }

                        host = host.rows[tidx];
                        if (host) {
                            if (tidx > 0) tok[2] = tidx + ". " + tok[2];
                            if (tok[2] != last_titles[tidx]) {
                                setTextForObject(host.cells[0].childNodes[0], last_titles[tidx] = tok[2]);
                                if (g_inspect_tridx == tidx)
                                    setTextForObject(document.getElementById("trackinspect_title"), tok[2]);
                            }
                            if (tok[4] != last_vols[tidx] || tok[5] != last_pans[tidx]) {
                                last_vols[tidx] = tok[4];
                                last_pans[tidx] = tok[5];

                                if (g_inspect_tridx == tidx) {
                                    var volf = document.getElementById("trackinspect_volf");
                                    var volh = document.getElementById("trackinspect_volh");
                                    setTextForObject(volh, mkvolstr(tok[4]));

                                    var vol = parseFloat(tok[4]);
                                    vol = vol < 0.0000001 ? -150 : Math.log(vol) * 8.68588963806;
                                    if (vol < minvol) vol = minvol;
                                    if (vol > maxvol) vol = maxvol;

                                    var h = volf.offsetHeight - volh.offsetHeight;
                                    if (h < 10) h = 10;
                                    volh.style.top = Math.floor(volf.offsetTop + h * (maxvol - vol) / (maxvol - minvol)) + "px";
                                }

                                setTextForObject(host.cells[0].childNodes[1], mkvolstr(tok[4]) + " " + mkpanstr(tok[5]));
                            }
                            if (tok[3] != last_flags[tidx]) {
                                last_flags[tidx] = tok[3];
                                if (tidx > 0) {
                                    host.cells[1].style.background = (tok[3] & 64) ? "#f88" : "#fff";
                                    var c = host.cells[2];
                                    switch (tok[3] & 384) {
                                        case 128: c.innerHTML = "mon<BR>on"; c.style.background = "#8f8"; break;
                                        case 256: c.innerHTML = "auto<BR>mon"; c.style.background = "#ff8"; break;
                                        default: c.innerHTML = "mon<BR>off"; c.style.background = "#888"; break;
                                    }
                                }
                                var c = host.cells[3];
                                c.style.background = (tok[3] & 8) ? "#88f" : "#fff";
                                c.innerHTML = (tok[3] & 8) ? "muted" : "mute";

                                if (g_inspect_tridx == tidx) {
                                    if (tidx > 0) {
                                        c = document.getElementById("trackinspect_arm");
                                        c.style.background = (tok[3] & 64) ? "#f88" : "#fff";

                                        c = document.getElementById("trackinspect_mon");
                                        switch (tok[3] & 384) {
                                            case 128: c.innerHTML = "mon<BR>on"; c.style.background = "#8f8"; break;
                                            case 256: c.innerHTML = "auto<BR>mon"; c.style.background = "#ff8"; break;
                                            default: c.innerHTML = "mon<BR>off"; c.style.background = "#888"; break;
                                        }
                                    }

                                    c = document.getElementById("trackinspect_mute");
                                    c.style.background = (tok[3] & 8) ? "#88f" : "#fff";
                                    c.innerHTML = (tok[3] & 8) ? "muted" : "mute";

                                    c = document.getElementById("trackinspect_solo");
                                    c.style.background = (tok[3] & 16) ? "#88f" : "#fff";
                                    c.innerHTML = (tok[3] & 16) ? "soloed" : "solo";

                                }
                            }
                        }
                    }
                }
                break;
        }
    }
}


wwr_req_recur("TRANSPORT", 10);
wwr_req_recur("GET/TRACK/0/SEND/0;GET/TRACK/0/SEND/1;NTRACK;TRACK;GET/40364", 1000);
wwr_start();

function updateOrientation() {
    var a = document.getElementById("viewport-meta");
    if (a) a.setAttribute("content", "width=320, user-scalable = no, minimum-scale = 1.0, maximum-scale = 1.0, initial-scale = 1.0");
}

function prompt_abort() {
    if (!(last_transport_state & 4)) {
        wwr_req(1016);
    } else {
        if (confirm("abort recording? contents will be lost!")) wwr_req(40668);
    }
}

function prompt_seek() {
    if (!(last_transport_state & 4)) {
        var seekto = prompt("Seek to position:", last_time_str);
        if (seekto != null) {
            wwr_req("SET/POS_STR/" + encodeURIComponent(seekto));
        }
    }
}

function prompt_clone() {
    if (g_inspect_tridx > 0) {
        var title = last_titles[g_inspect_tridx];
        var newtitle = prompt("Clone track " + title.replace(/[.] .*/, "") + " without media to new track:",
            title.replace(/^[0-9]*?[.] /, ""));
        if (newtitle != null) {
            wwr_req("SET/UNDO_BEGIN;40297;SET/TRACK/" + g_inspect_tridx + "/SEL/1;40062;40421;40006;" +
                "SET/TRACK/" + (g_inspect_tridx + 1) + "/P_NAME/" + encodeURIComponent(newtitle) +
                ";GET/TRACK/" + g_inspect_tridx + ";SET/UNDO_END/Clone%20track%20without%20media");

            inspect_track_handler(g_inspect_tridx + 1)();
        }
    }
    return false;
}

function inspect_track_handler(tidx) {
    return function (e) {
        if (typeof e == 'undefined') e = event;
        if (e.preventDefault) e.preventDefault();
        g_inspect_tridx = parseInt(tidx);
        document.getElementById("trackinspect").style.display = tidx >= 0 ? "inline" : "none";
        if (tidx >= 0) {
            document.ontouchmove = function (e) { e.preventDefault(); }

            last_titles[tidx] = null;
            last_vols[tidx] = null;
            last_flags[tidx] = null;
            wwr_req("TRACK/" + tidx);
            if (tidx == 0) {
                var c = document.getElementById("trackinspect_arm");
                c.innerHTML = "main<br>out";
                c.style.background = last_out_states[0] ? "#88f" : "#fff";

                c = document.getElementById("trackinspect_mon");
                c.innerHTML = "aux<br>out";
                c.style.background = last_out_states[1] ? "#88f" : "#fff";

                c = document.getElementById("trackinspect_clone");
                c.innerHTML = "metronome";
                c.style.background = last_metronome ? "#8f8" : "#777";
            } else {
                document.getElementById("trackinspect_arm").innerHTML = "arm";
                document.getElementById("trackinspect_mon").innerHTML = "mon";
                document.getElementById("trackinspect_clone").innerHTML = "clone<br>without<br>media";
            }
        } else {
            setTextForObject(document.getElementById("trackinspect_title"), "");
            setTextForObject(document.getElementById("trackinspect_volh"), "");
            document.ontouchmove = function (e) { return true; }
        }
        return false;
    };
}
g_outputs = null;
g_outputs_by_name = {};
function init() {
    updateOrientation();
    //Request midi accsess
    navigator.requestMIDIAccess().then(function (midi_access) {
        console.log("MIDI ready!");
        var inputs = midi_access.inputs.values();
        g_outputs = midi_access.outputs.values();
        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            input.value.onmidimessage = on_midi_msg;
            console.log("input:", input.value.name);
        }
        for (var output = g_outputs.next(); output && !output.done; output = g_outputs.next()) {
            g_outputs_by_name[output.value.name] = output.value;
            console.log("output:", output.value.name);
        }
    }, function (msg) {
        console.log("Failed to get MIDI access - ", msg);
    });


    function on_midi_msg(event) {
        const val = event.data[2];
        // if it's not a control message
        if (event.data[0] != 176)
            return;
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
            default:
                break;
        }
    }

    function send_trk_vol(trackIndex, encoderValue) {
        wwr_req("SET/TRACK/" + trackIndex + "/VOL/" + (encoderValue / 127) * 4 ** (encoderValue / 127));
    }

    function send_next_trk(trk_idx) {
        if (trk_idx >= last_track_cnt - 1)
            wwr_req(`SET/TRACK/${trk_idx}/SEL/0;SET/TRACK/1/SEL/1`);
        wwr_req(`SET/TRACK/${trk_idx}/SEL/0;SET/TRACK/${++trk_idx}/SEL/1`);

        // Since we are polling with frequence 1/1s, we can get state mismatch
        // if user clicks faster than that, hence the "wwr_req('TRACK')" - it
        // will refresh the state accordingly.
        wwr_req('TRACK');

    }

    function send_prev_trk(trk_idx) {
        if (trk_idx <= 1) {
            wwr_req(`SET/TRACK/${trk_idx}/SEL/0;SET/TRACK/${last_track_cnt - 1}/SEL/1`);
        }
        wwr_req(`SET/TRACK/${trk_idx}/SEL/0;SET/TRACK/${--trk_idx}/SEL/1`);

        // Since we are polling with frequence 1/1s, we can get state mismatch
        // if user clicks faster than that, hence the "wwr_req('TRACK')" - it
        // will refresh the state accordingly.
        wwr_req('TRACK');

    }

    document.getElementById("trackinspect_clone").onmousedown = function (e) {
        if (g_inspect_tridx > 0) return prompt_clone();
        return mouseDownEventHandler("40364;GET/40364")(e);
    };
    document.getElementById("trackinspect_arm").onmousedown = function (e) {
        if (g_inspect_tridx == 0)
            return mouseDownEventHandler("SET/TRACK/0/SEND/0/MUTE/-1;GET/TRACK/0/SEND/0")(e);
        return mouseDownEventHandler("SET/TRACK/" + g_inspect_tridx + "/RECARM/-1;TRACK/" + g_inspect_tridx)(e);
    };
    document.getElementById("trackinspect_mon").onmousedown = function (e) {
        if (g_inspect_tridx == 0)
            return mouseDownEventHandler("SET/TRACK/0/SEND/1/MUTE/-1;GET/TRACK/0/SEND/1")(e);
        return mouseDownEventHandler("SET/TRACK/" + g_inspect_tridx + "/RECMON/-1;TRACK/" + g_inspect_tridx)(e);
    };
    document.getElementById("trackinspect_mute").onmousedown = function (e) {
        return mouseDownEventHandler("SET/TRACK/" + g_inspect_tridx + "/MUTE/-1;TRACK/" + g_inspect_tridx)(e);
    };
    document.getElementById("trackinspect_solo").onmousedown = function (e) {
        mouseDownEventHandler("SET/TRACK/" + g_inspect_tridx + "/SOLO/-1;TRACK/" + g_inspect_tridx)(e);
    };
}

function volfader(e, istouch) {
    var fader = document.getElementById("trackinspect_volf");
    var handle = document.getElementById("trackinspect_volh");
    if (typeof e == 'undefined') e = event;
    if (e.preventDefault) e.preventDefault();
    e.returnValue = false;

    var sh = fader.offsetHeight - handle.offsetHeight;
    if (sh < 10) sh = 10;
    var starty = e.pageY || e.clientY || e.touches[0].pageY;

    var movee = function (e) {
        if (typeof e == 'undefined') e = event;
        if (e.preventDefault) e.preventDefault();
        e.returnValue = false;
        var thisy = e.pageY || e.clientY || e.touches[0].pageY;
        var dy = thisy - starty;
        starty = thisy;

        dy = - 100 * dy / sh;
        if (dy >= 0) dy = "+" + dy;
        wwr_req("SET/TRACK/" + g_inspect_tridx + "/VOL/" + dy + ";TRACK/" + g_inspect_tridx)
        return false;
    };

    if (istouch) {
        var end = function (e) {
            document.removeEventListener('touchmove', movee, true);
            document.removeEventListener('touchend', end, true);
            return false;
        };
        document.addEventListener('touchmove', movee, true);
        document.addEventListener('touchend', end, true);
    } else {
        document.onmousemove = movee;
        document.onmouseup = function (e) {
            document.onmousemove = null;
            document.onmouseup = null;
            return false;
        }
    }
    return false;
};

function rename_track(e) {
    if (g_inspect_tridx > 0) {
        var title = last_titles[g_inspect_tridx];
        var newtitle = prompt("Rename track " + title.replace(/[.] .*/, "") + ":",
            title.replace(/^[0-9]*?[.] /, ""));
        if (newtitle != null) {
            wwr_req("SET/TRACK/" + g_inspect_tridx + "/P_NAME/" + encodeURIComponent(newtitle) + ";GET/TRACK/" + g_inspect_tridx + ";SET/UNDO/Rename%20Track");
        }
    }
    return false;
}

function on_record_button(e) {
    var x;
    for (x = 1; x < last_track_cnt && 0 == (last_flags[x] & 64); x++);
    if (x < last_track_cnt || confirm("no tracks are armed, start record?")) wwr_req(1013);
    return false;
}
