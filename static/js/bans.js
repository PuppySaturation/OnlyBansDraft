function init(view_type, draft_id){

    msg_text = document.getElementById('messageText');
    civ_bans_text = document.getElementById('civBansText');
    map_bans_text = document.getElementById('mapBansText');
    insta_bans_text = document.getElementById('instaBansText');

    map_list = document.getElementById('mapList');
    civ_list = document.getElementById('civList');
    host_bans = document.getElementById('hostBans');
    guest_bans = document.getElementById('guestBans');
    round_selections = document.getElementsByClassName('round_selection');

    for(let obj of [map_list, civ_list, host_bans, guest_bans]){
        obj.style.display='none';
    }
    for(let obj of round_selections){
        obj.style.display='none';
    }
}