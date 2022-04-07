let map_bans_max = 0;
let map_bans_count = 0;
let civ_bans_max = 0;
let civ_bans_count = 0;
let insta_bans_max = 0;
let insta_bans_count = 0;
let banned_map_list = [];
let banned_civ_list = [];

let my_bans_div=undefined;

let ws_connection = undefined;
let ws_updates = undefined;
let img_placeholder_src = undefined;

let view_type_param;

function init(view_type, draft_id, n_map_bans, n_civ_bans, n_insta_bans){
    view_type_param = view_type;
    map_bans_max = n_map_bans;
    civ_bans_max = n_civ_bans;
    insta_bans_max = n_insta_bans;

    banned_map_list = Array(map_bans_max).fill(undefined);
    banned_civ_list = Array(civ_bans_max).fill(undefined);

    update_bans_text();

    msg_text = document.getElementById('messageText');

    map_list_div = document.getElementById('mapList');
    civ_list_div = document.getElementById('civList');
    host_bans_div = document.getElementById('hostBans');
    guest_bans_div = document.getElementById('guestBans');
    round_selections = document.getElementsByClassName('round_selection');

    let map_icons_list = map_list_div.getElementsByClassName('map_icon');
    let civ_icons_list = civ_list_div.getElementsByClassName('civ_icon');

    let placeholder_img = host_bans_div.getElementsByClassName('map_icon')[0];
    img_placeholder_src = placeholder_img.src;

    //for(let obj of [map_list_div, civ_list_div, host_bans_div, guest_bans_div]){
    //    obj.style.display='none';
    //}
    for(let obj of round_selections){
        obj.style.display='none';
    }

    let buttons = document.getElementsByClassName('ready_btn');
    for(let btn of buttons){
        btn.hidden=true;
    }
    if(view_type=='watch'){
        // only spectating
    }else{
        // interactive
        for(let icon of map_icons_list){
            icon.onclick = ()=>{toggle_banned_map(icon);};
        }
        for(let icon of civ_icons_list){
            icon.onclick = ()=>{toggle_banned_civ(icon);};
        }

        if(view_type=='host'){
            my_bans_div = host_bans_div;
        }else
        if(view_type=='join'){
            my_bans_div = guest_bans_div;
        }else{
            throw 'view type is not recognized: '+str(view_type);
        }

        let ready_btn = my_bans_div.getElementsByClassName('ready_btn')[0];
        ready_btn.onclick = submit_bans;
        ready_btn.hidden=false;

    }

    let ws_protocol = undefined;
    if(location.protocol == 'https:'){
        ws_protocol = 'wss://';
    }else
    if(location.protocol == 'http:'){
        ws_protocol = 'ws://';
    }

    let ws_update_address = ws_protocol+document.domain+':'+location.port+'/watch/ws/'+draft_id;
    if(view_type=='host' || view_type=='join'){
        let ws_address = ws_protocol+document.domain+':'+location.port+'/';
        ws_address += view_type+'/ws/'+draft_id;
        ws_connection = new WebSocket(ws_address);
        ws_connection.onmessage = (event)=>{
            action_json = JSON.parse(event.data);
            console.log(action_json);
            process_server_action(action_json);
        }
    }

    ws_updates = new WebSocket(ws_update_address);
    ws_updates.onmessage = (event)=>{
        let draft_json = JSON.parse(event.data);
        console.log(draft_json);
        if(draft_json.draft_id != undefined){
            for(let action_json of draft_json.actions){
                process_server_action(action_json);
            }
        }else{
            process_server_action(draft_json);
        }
    }
}

function submit_bans(){
    if(map_bans_count!=map_bans_max){
        return;
    }
    if(civ_bans_count!=civ_bans_max){
        return;
    }

    let bans_submission = {
    'action' : 'submit_bans',
    'map_bans': banned_map_list,
    'civ_bans': banned_civ_list,
    };

    console.log(bans_submission);
    ws_connection.send(JSON.stringify(bans_submission));
}

function toggle_banned(element, banned_list){
    if(!element.classList.contains('banned')){
        element.classList.add('banned')
        return true;
    }else{
        element.classList.remove('banned')
        return false;
    }
}
function toggle_banned_map(element){
    if(toggle_banned(element)){
        // ban it
        if(map_bans_count < map_bans_max){
            map_bans_count += 1;
            let ind_spot = banned_map_list.indexOf(undefined);
            banned_map_list[ind_spot]=element.id;
            update_map_ban_icons(ind_spot);
        }else{
            toggle_banned(element);
        }
    }else{
        // unban it
        map_bans_count -= 1;
        let ind_spot = banned_map_list.indexOf(element.id);
        banned_map_list[ind_spot]=undefined;
        update_map_ban_icons(ind_spot);
    }
    update_bans_text();
}
function toggle_banned_civ(element){
    if(toggle_banned(element)){
        // ban it
        if(civ_bans_count < civ_bans_max){
            civ_bans_count += 1;
            let ind_spot = banned_civ_list.indexOf(undefined);
            banned_civ_list[ind_spot]=element.id;
            update_civ_ban_icons(ind_spot);
        }else{
            toggle_banned(element);
        }
    }else{
        // unban it
        civ_bans_count -= 1;
        let ind_spot = banned_civ_list.indexOf(element.id);
        banned_civ_list[ind_spot]=undefined;
        update_civ_ban_icons(ind_spot);
    }
    update_bans_text();
}

function update_map_ban_icons(ind){
    let map_icon_divs = my_bans_div.getElementsByClassName('map_icon');
    let map_id = banned_map_list[ind];
    let img_src;
    if(map_id == undefined){
        img_src=img_placeholder_src;
    }else{
        let map_icon = document.getElementById(map_id);
        img_src=map_icon.src;
    }
    map_icon_divs[ind].src=img_src;
}

function update_civ_ban_icons(ind){
    let civ_icon_divs = my_bans_div.getElementsByClassName('civ_icon');
    let civ_id = banned_civ_list[ind];
    let img_src;
    if(civ_id == undefined){
        img_src=img_placeholder_src;
    }else{
        let civ_icon = document.getElementById(civ_id);
        img_src=civ_icon.src;
    }
    civ_icon_divs[ind].src=img_src;
}

function process_server_action(action_json){
    switch(action_json['action']){
        case 'update_bans':
            server_update_bans(action_json);
            break;
        case 'start_round':
            server_update_round(action_json);
            break;
        case 'ready_round':
            server_ready_round(action_json);
            break;
        case 'finish_round':
            server_finish_round(action_json);
            break;
        case 'update_instaban':
            break;
    }
}

function server_update_bans(bans_json){
    let guest_bans = bans_json.guest_bans;
    let host_bans = bans_json.host_bans;

    map_bans_count = map_bans_max;
    civ_bans_count = civ_bans_max;

    let map_list_div = document.getElementById('mapList');
    let civ_list_div = document.getElementById('civList');
    let map_icons_list = map_list_div.getElementsByClassName('map_icon');
    let civ_icons_list = civ_list_div.getElementsByClassName('civ_icon');
    for(let icon of map_icons_list){
        icon.onclick = undefined;
    }
    for(let icon of civ_icons_list){
        icon.onclick = undefined;
    }

    let host_bans_div = document.getElementById('hostBans');
    let guest_bans_div = document.getElementById('guestBans');

    function f(icon_els, ban_ids){
        for(let n=0; n<ban_ids.length; n+=1){
            let id = ban_ids[n];
            let icon = document.getElementById(id);
            icon_els[n].src=icon.src;
            icon.classList.add('banned')
        }
    }

    let host_bans_map_icons = host_bans_div.getElementsByClassName('map_icon');
    f(host_bans_map_icons, host_bans.map_bans)
    let host_bans_civ_icons = host_bans_div.getElementsByClassName('civ_icon');
    f(host_bans_civ_icons, host_bans.civ_bans)
    let guest_bans_map_icons = guest_bans_div.getElementsByClassName('map_icon');
    f(guest_bans_map_icons, guest_bans.map_bans)
    let guest_bans_civ_icons = guest_bans_div.getElementsByClassName('civ_icon');
    f(guest_bans_civ_icons, guest_bans.civ_bans)

    let bans_ready_btn = my_bans_div.getElementsByClassName('ready_btn')[0];
    bans_ready_btn.onclick = undefined;
    bans_ready_btn.hidden=true;

    update_bans_text();
    enable_start_round(0);

    let round_div = document.getElementById('no_round');
    round_div.removeAttribute('style');

}

function enable_start_round(r){
    if(view_type_param=='watch'){
        return;
    }

    let btn = document.getElementById('start_r'+r+'_btn');
    btn.hidden=false;
    btn.onclick = ()=>{
        let action_json = {'action':'next_round'};
        ws_connection.send(JSON.stringify(action_json));
    }
}

function server_update_round(action_json){
    let map_id = action_json.map;
    let host_civ_id = action_json.host_civ;
    let guest_civ_id = action_json.guest_civ;
    let r = action_json.round_numb;

    let btn = document.getElementById('start_r'+r+'_btn');
    btn.hidden=false;
    btn.onclick = undefined;

    let src_map_icon = document.getElementById(map_id);
    let src_host_civ_icon = document.getElementById(host_civ_id);
    let src_guest_civ_icon = document.getElementById(guest_civ_id);

    let round_div = document.getElementById('round_'+r);
    round_div.removeAttribute('style');

    let host_civ_div = document.getElementById('host_civ_r'+r);
    let host_civ_icon_div = document.createElement('img');
    host_civ_icon_div.src = src_host_civ_icon.src;
    host_civ_icon_div.classList.add('civ_icon');
    host_civ_div.appendChild(host_civ_icon_div);

    let guest_civ_div = document.getElementById('guest_civ_r'+r);
    let guest_civ_icon_div = document.createElement('img');
    guest_civ_icon_div.src = src_guest_civ_icon.src;
    guest_civ_icon_div.classList.add('civ_icon');
    guest_civ_div.appendChild(guest_civ_icon_div);

    let map_div = document.getElementById('map_r'+r);
    let map_icon_div = document.createElement('img');
    map_icon_div.src = src_map_icon.src;
    map_icon_div.classList.add('map_icon');
    map_div.appendChild(map_icon_div);
}

function server_ready_round(action_json){
    let ready_target = action_json.target;

    let r = action_json.round_numb;
    let btn = document.getElementById('ready_r'+r+'_btn');

    if(ready_target!=view_type_param){
        btn.hidden=true;
    }else{
        btn.hidden=false;
        btn.onclick = ()=>{
            let action_json = {'action':'ready_round'};
            ws_connection.send(JSON.stringify(action_json));
        }
    }

}

function server_finish_round(action_json){
    let r = action_json.round_numb;
    enable_start_round(r+1);
}

function update_bans_text(){
    let civ_bans_text = document.getElementById('civBansText');
    let map_bans_text = document.getElementById('mapBansText');
    let insta_bans_text = document.getElementById('instaBansText');

    civ_bans_text.innerText = 'Number of civ bans remaining: '+(civ_bans_max-civ_bans_count)+'/'+(civ_bans_max);
    map_bans_text.innerText = 'Number of map bans remaining: '+(map_bans_max-map_bans_count)+'/'+(map_bans_max);
    insta_bans_text.innerText = 'Number of insta bans remaining: '+(insta_bans_max-insta_bans_count)+'/'+(insta_bans_max);
}
