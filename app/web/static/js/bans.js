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

function init(view_type, draft_id, n_map_bans, n_civ_bans, n_insta_bans){
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

    if(view_type=='watch'){
        // only spectating
        let buttons = document.getElementsByClassName('ready_btn');
        for(let btn of buttons){
            btn.hidden=true;
        }
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
            let ready_btn = guest_bans_div.getElementsByClassName('ready_btn')[0];
            ready_btn.hidden=true;
        }else
        if(view_type=='join'){
            my_bans_div = guest_bans_div;
            let ready_btn = host_bans_div.getElementsByClassName('ready_btn')[0];
            ready_btn.hidden=true;
        }else{
            throw 'view type is not recognized: '+str(view_type);
        }

        let ready_btn = my_bans_div.getElementsByClassName('ready_btn')[0];
        ready_btn.onclick = submit_bans;

    }

    let ws_update_address = 'ws://'+document.domain+':'+location.port+'/watch/ws/'+draft_id;
    if(view_type=='host' || view_type=='join'){
        let ws_address = 'ws://'+document.domain+':'+location.port+'/';
        ws_address += view_type+'/ws/'+draft_id;
        ws_connection = new WebSocket(ws_address);
        ws_connection.onmessage = (event)=>{
            console.log('CONNECTION',event.data);
        }
    }

    ws_updates = new WebSocket(ws_update_address);
    ws_updates.onmessage = (event)=>{
        console.log('UPDATE',event.data);
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
function update_bans_text(){
    let civ_bans_text = document.getElementById('civBansText');
    let map_bans_text = document.getElementById('mapBansText');
    let insta_bans_text = document.getElementById('instaBansText');

    civ_bans_text.innerText = 'Number of civ bans remaining: '+(civ_bans_max-civ_bans_count)+'/'+(civ_bans_max);
    map_bans_text.innerText = 'Number of map bans remaining: '+(map_bans_max-map_bans_count)+'/'+(map_bans_max);
    insta_bans_text.innerText = 'Number of insta bans remaining: '+(insta_bans_max-insta_bans_count)+'/'+(insta_bans_max);
}
