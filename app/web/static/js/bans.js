let map_bans_max = 0;
let map_bans_count = 0;
let civ_bans_max = 0;
let civ_bans_count = 0;
let insta_bans_max = 0;
let insta_bans_count = 0;
let banned_map_list = [];
let banned_civ_list = [];

let bans_state = '';

let my_bans_div=undefined;

let ws_connection = undefined;
let ws_updates = undefined;
let img_placeholder_src = undefined;

let view_type;
let auto_respond=true;
let fast_forward_actions=true;

function init(view_type_arg, draft_id, n_map_bans, n_civ_bans, n_insta_bans){

    if(navigator.userAgent.indexOf('Chrome')==-1 &&
        navigator.userAgent.indexOf('Firefox')==-1){
        window.alert("This website was developed and tested on Chrome and Firefox browsers. "+
         "This browser does not appear to be one of them. "+
         "Please note, that some functionalities might not work.");
    }

    let url = document.URL;
    let last_element = url.split('/').pop();
    if(last_element == '1'){
        let new_url = url.slice(0, -2);
        history.pushState({}, '', new_url);
    }

    view_type = view_type_arg;
    map_bans_max = n_map_bans;
    civ_bans_max = n_civ_bans;
    insta_bans_max = n_insta_bans;

    banned_map_list = Array(map_bans_max).fill(undefined);
    banned_civ_list = Array(civ_bans_max).fill(undefined);

    bans_state = 'initial_bans';

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

    let next_action_btn = document.getElementById('next_action_btn');
    let ff_actions_btn = document.getElementById('ff_actions_button');
    if(view_type=='watch'){
        // only spectating
        fast_forward_actions=false;

        next_action_btn.hidden=false;
        ff_actions_btn.hidden=false;

        next_action_btn.onclick = replay_actions;
        ff_actions_btn.onclick = ()=>{
           fast_forward_actions=true;
           replay_actions();
           fast_forward_actions=false;
        };

        let map_list_div = document.getElementById('mapList');
        let map_list_text = map_list_div.getElementsByClassName('instruction_text')[0];
        map_list_text.innerText = "";
        let civ_list_div = document.getElementById('civList');
        let civ_list_text = civ_list_div.getElementsByClassName('instruction_text')[0];
        civ_list_text.innerText = "";

        let civ_bans_text = document.getElementById('civBansText');
        let map_bans_text = document.getElementById('mapBansText');
        let insta_bans_text = document.getElementById('instaBansText');
        civ_bans_text.hidden=true;
        map_bans_text.hidden=true;
        insta_bans_text.hidden=true;
    }else{
        // interactive
        next_action_btn.hidden=true;
        ff_actions_btn.hidden=true

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
        ws_connection = new ReconnectingWebSocket(ws_address);
        ws_connection.onmessage = (event)=>{
            response_json = JSON.parse(event.data);
            console.log(response_json);
            if(response_json.response != 'ok'){
                window.alert(response_json.response);
            }

        }
    }

    ws_updates = new ReconnectingWebSocket(ws_update_address);
    ws_updates.onmessage = (event)=>{
        let draft_json = JSON.parse(event.data);
        console.log(draft_json);
        if(draft_json.draft_id != undefined){
            map_bans_max = draft_json.map_bans;
            map_bans_count = 0;
            civ_bans_max = draft_json.civ_bans;
            civ_bans_count = 0;
            insta_bans_max = draft_json.insta_bans;
            insta_bans_count = 0;
            bans_state = 'initial_bans';
            update_bans_text();

            update_host_name(draft_json.host_name);
            update_guest_name(draft_json.guest_name);

            auto_respond=false;
            pending_actions = draft_json.actions;
            let msg_p = document.getElementById('messageText');
            msg_p.innerText = 'New actions are available';
            replay_actions();
            auto_respond=true;
        }else{
            if(view_type=='watch'){
                pending_actions.push(draft_json);
                let msg_p = document.getElementById('messageText');
                msg_p.innerText = 'New actions are available';
            }else{
                process_server_action(draft_json);
            }
        }
    }
}

let pending_actions = [];
function replay_actions(){
    if(fast_forward_actions){
        for(let action_json of pending_actions){
            process_server_action(action_json);
        }
        pending_actions=[];
        let msg_p = document.getElementById('messageText');
        msg_p.innerText = 'Caught up live';
    }else{
        while(true){
            if(pending_actions.length == 0){
                break;
            }
            let action_json = pending_actions[0];
            pending_actions = pending_actions.slice(1);
            process_server_action(action_json);
            let skip_actions = new Set(['ready_round']);
            if(!skip_actions.has(action_json.action)){
                break;
            };
        }
        if(pending_actions.length == 0){
            let msg_p = document.getElementById('messageText');
            msg_p.innerText = 'Caught up live';
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
        if(view_type=='host'){
            element.classList.add('host_banned');
        }else if(view_type=='join'){
            element.classList.add('guest_banned');
        }
        element.classList.add('banned')
        return true;
    }else{
        if(view_type=='host'){
            element.classList.remove('host_banned');
        }else if(view_type=='join'){
            element.classList.remove('guest_banned');
        }
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
    let map_icon_div = my_bans_div.getElementsByClassName('map_icon')[ind];
    let map_id = banned_map_list[ind];
    let img_src;
    let label_text;
    if(map_id == undefined){
        img_src=img_placeholder_src;
        label_text='???';
    }else{
        let map_icon = document.getElementById(map_id);
        img_src=map_icon.src;
        label_text=map_icon.parentNode.parentNode.getElementsByTagName('p')[0].innerText;
    }
    map_icon_div.src=img_src;
    map_icon_div.parentNode.parentNode.getElementsByTagName('p')[0].innerText=label_text;
}

function update_civ_ban_icons(ind){
    let civ_icon_div = my_bans_div.getElementsByClassName('civ_icon')[ind];
    let civ_id = banned_civ_list[ind];
    let img_src;
    let label_text;
    if(civ_id == undefined){
        img_src=img_placeholder_src;
        label_text='???';
    }else{
        let civ_icon = document.getElementById(civ_id);
        img_src=civ_icon.src;
        label_text=civ_icon.parentNode.parentNode.getElementsByTagName('p')[0].innerText;
    }
    civ_icon_div.src=img_src;
    civ_icon_div.parentNode.parentNode.getElementsByTagName('p')[0].innerText=label_text;
}

function process_server_action(action_json){
    console.log(action_json);
    switch(action_json['action']){
        case 'update_names':
            update_host_name(action_json.host_name);
            update_guest_name(action_json.guest_name);
            break;
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
            server_update_instaban(action_json);
            break;
    }
    window.scrollTo(0,document.body.scrollHeight);
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

    function f(icon_els, ban_ids, ban_type_class){
        for(let n=0; n<ban_ids.length; n+=1){
            let id = ban_ids[n];
            let icon = document.getElementById(id);
            icon_els[n].src=icon.src;

            label_text=icon.parentNode.parentNode.getElementsByTagName('p')[0].innerText;
            icon_els[n].parentNode.parentNode.getElementsByTagName('p')[0].innerText=label_text;

            icon.classList.add('banned')
            icon.classList.add(ban_type_class)
        }
    }

    let host_bans_map_icons = host_bans_div.getElementsByClassName('map_icon');
    f(host_bans_map_icons, host_bans.map_bans, 'host_banned')
    let host_bans_civ_icons = host_bans_div.getElementsByClassName('civ_icon');
    f(host_bans_civ_icons, host_bans.civ_bans, 'host_banned')
    let guest_bans_map_icons = guest_bans_div.getElementsByClassName('map_icon');
    f(guest_bans_map_icons, guest_bans.map_bans, 'guest_banned')
    let guest_bans_civ_icons = guest_bans_div.getElementsByClassName('civ_icon');
    f(guest_bans_civ_icons, guest_bans.civ_bans, 'guest_banned')

    if(my_bans_div){
        let bans_ready_btn = my_bans_div.getElementsByClassName('ready_btn')[0];
        bans_ready_btn.onclick = undefined;
        bans_ready_btn.hidden=true;
    }

    update_bans_text();
    enable_start_round(0);

    let round_div = document.getElementById('no_round');
    round_div.removeAttribute('style');

}

function enable_start_round(r){
    if(view_type=='watch'){
        return;
    }

    let btn = document.getElementById('start_r'+r+'_btn');
    if(btn != undefined){
        btn.hidden=false;
        btn.onclick = ()=>{
            let action_json = {'action':'next_round'};
            ws_connection.send(JSON.stringify(action_json));
        }
    }
}

function clear_events_from_round(r){
    let host_civ_div = document.getElementById('host_civ_r'+r);
    let guest_civ_div = document.getElementById('guest_civ_r'+r);

    for(let civ_icon_div of host_civ_div.childNodes){
        civ_icon_div.onclick=undefined;
    }
    for(let civ_icon_div of guest_civ_div.childNodes){
        civ_icon_div.onclick=undefined;
    }

}

function server_update_round(action_json){
    let map_id = action_json.map;
    let host_civ_id = action_json.host_civ;
    let guest_civ_id = action_json.guest_civ;
    let r = action_json.round_numb;
    bans_state = 'round_'+r;
    update_bans_text();

    if(r>0){
        clear_events_from_round(r-1);
    }
    if(view_type=='watch'){
        let msg_p = document.getElementById('message_r'+r);
        msg_p.innerText = 'players are choosing bans';
    }

    let btn = document.getElementById('start_r'+r+'_btn');
    btn.hidden=true;
    btn.onclick = undefined;

    let src_map_template = document.getElementById(map_id).parentNode.parentNode;
    let src_host_civ_template = document.getElementById(host_civ_id).parentNode.parentNode;
    let src_guest_civ_template = document.getElementById(guest_civ_id).parentNode.parentNode;

    let round_div = document.getElementById('round_'+r);
    round_div.removeAttribute('style');

    let host_civ_div = document.getElementById('host_civ_r'+r);
    let host_civ_icon_div = create_icon_div(src_host_civ_template);
    removeAllChildren(host_civ_div);
    host_civ_div.appendChild(host_civ_icon_div);

    let guest_civ_div = document.getElementById('guest_civ_r'+r);
    let guest_civ_icon_div = create_icon_div(src_guest_civ_template);
    removeAllChildren(guest_civ_div);
    guest_civ_div.appendChild(guest_civ_icon_div);


    let ready_btn = document.getElementById('ready_r'+r+'_btn');
    let iban_host_btn = document.getElementById('ban_host_r'+r+'_btn');
    let iban_guest_btn = document.getElementById('ban_guest_r'+r+'_btn');
    iban_host_btn.innerText = 'Insta-ban '+host_civ_id;
    iban_guest_btn.innerText = 'Insta-ban '+guest_civ_id;

    ready_btn.onclick = ()=>{
        let action_json = {'action':'ready_round'};
        ws_connection.send(JSON.stringify(action_json));
    }

    iban_host_btn.onclick = ()=>{
        iban_host_btn.hidden=true;
        iban_guest_btn.hidden=true;
        ready_btn.hidden=true;
        let action_json={
            'action':'insta_ban',
            'target':'host_civ',
        }
        ws_connection.send(JSON.stringify(action_json));
    }

   iban_guest_btn.onclick = ()=>{
        iban_host_btn.hidden=true;
        iban_guest_btn.hidden=true;
        ready_btn.hidden=true;
        let action_json={
            'action':'insta_ban',
            'target':'guest_civ',
        }
        ws_connection.send(JSON.stringify(action_json));
    }

    let map_div = document.getElementById('map_r'+r);
    let map_icon_div = create_icon_div(src_map_template);
    removeAllChildren(map_div);
    map_div.appendChild(map_icon_div);
}

function removeAllChildren(parent_node){
    while(parent_node.firstChild){
        parent_node.removeChild(parent_node.firstChild);
    }
}

function server_ready_round(action_json){
    let ready_target = action_json.target;

    let r = action_json.round_numb;
    let start_btn = document.getElementById('start_r'+r+'_btn');
    start_btn.hidden=true;
    start_btn.onclick=undefined;

    let ready_btn = document.getElementById('ready_r'+r+'_btn');
    let iban_host_btn = document.getElementById('ban_host_r'+r+'_btn');
    let iban_guest_btn = document.getElementById('ban_guest_r'+r+'_btn');
    let msg_p = document.getElementById('message_r'+r);

    if(view_type=='watch'){
        ready_btn.hidden=true;
        msg_p.innerText = 'players are choosing bans';
    }else if(ready_target!=view_type){
        ready_btn.hidden=true;
        iban_host_btn.hidden=true;
        iban_guest_btn.hidden=true;
        msg_p.innerText = 'waiting for opponent';
    }else{
        if(auto_respond && (insta_bans_count >= insta_bans_max)){
            // no instabans left, just return ready_round
            ready_btn.hidden=true;
            iban_host_btn.hidden=true;
            iban_guest_btn.hidden=true;
            ready_btn.onclick();
        }else
        {
            msg_p.innerText = 'pick civ to insta-ban';
            ready_btn.hidden=false;
             if(insta_bans_count < insta_bans_max){
                iban_host_btn.hidden=false;
                iban_guest_btn.hidden=false;
             }
        }
    }

}

function server_update_instaban(action_json){
    let target = action_json.target; // guest_civ or host_civ
    let new_civ_id = action_json.new_civ; // civ_id
    let user = action_json.user; // guest or host
    let r = action_json.round_numb; //
    let civ_icons_div;

    let ready_btn = document.getElementById('ready_r'+r+'_btn');
    let iban_host_btn = document.getElementById('ban_host_r'+r+'_btn');
    let iban_guest_btn = document.getElementById('ban_guest_r'+r+'_btn');

    if(target=='guest_civ'){
        civ_icons_div = document.getElementById('guest_civ_r'+r);
        iban_guest_btn.innerText='Insta-ban '+new_civ_id;
    }else
    if(target=='host_civ'){
        civ_icons_div = document.getElementById('host_civ_r'+r);
        iban_host_btn.innerText='Insta-ban '+new_civ_id;
    }
    let prev_civ_div = civ_icons_div.lastChild;
    prev_civ_div.getElementsByTagName('img')[0].classList.add('banned');
    if(user=='guest'){
        prev_civ_div.getElementsByTagName('img')[0].classList.add('guest_banned');
    }else if(user=='host'){
        prev_civ_div.getElementsByTagName('img')[0].classList.add('host_banned');
    }

    let civ_div_template = document.getElementById(new_civ_id).parentNode.parentNode;
    let new_civ_div = create_icon_div(civ_div_template);
    civ_icons_div.appendChild(new_civ_div);

    if((user=='guest' && view_type=='join') ||
       (user=='host' && view_type=='host')){
       insta_bans_count += 1;
       update_bans_text();
    }
}

function server_finish_round(action_json){
    let r = action_json.round_numb;
    let ready_btn = document.getElementById('ready_r'+r+'_btn');
    let iban_host_btn = document.getElementById('ban_host_r'+r+'_btn');
    let iban_guest_btn = document.getElementById('ban_guest_r'+r+'_btn');
    let msg_p = document.getElementById('message_r'+r);
    msg_p.innerText='';
    ready_btn.hidden=true;
    iban_host_btn.hidden=true;
    iban_guest_btn.hidden=true;
    ready_btn.onclick=undefined;
    iban_host_btn.onclick=undefined;
    iban_guest_btn.onclick=undefined;
    enable_start_round(r+1);
}

function update_bans_text(){
   let civ_bans_text = document.getElementById('civBansText');
   let map_bans_text = document.getElementById('mapBansText');
   let insta_bans_text = document.getElementById('instaBansText');
   if(view_type=='watch'){
        civ_bans_text.hidden=false;
        map_bans_text.hidden=false;
        insta_bans_text.hidden=false;
   }else
   if(bans_state=='initial_bans'){
        civ_bans_text.hidden=false;
        map_bans_text.hidden=false;
        insta_bans_text.hidden=true;
        civ_bans_text.innerText = 'Number of civ bans remaining: '+(civ_bans_max-civ_bans_count)+'/'+(civ_bans_max);
        map_bans_text.innerText = 'Number of map bans remaining: '+(map_bans_max-map_bans_count)+'/'+(map_bans_max);
    }else
    if(bans_state.startsWith('round')){
        civ_bans_text.hidden=true;
        map_bans_text.hidden=true;
        insta_bans_text.hidden=false;
        insta_bans_text.innerText = 'Number of insta bans remaining: '+(insta_bans_max-insta_bans_count)+'/'+(insta_bans_max);
    }
}


function submit_name_update(){
    let name_tb = document.getElementById('name_textbox');
    let new_name = name_tb.value;

    let action_json = {
    'action':'update_name',
    'name':new_name,
    };
    ws_connection.send(JSON.stringify(action_json));
}

function update_host_name(new_name){
    let host_name_els = document.getElementsByClassName('host_name');
    for(let el of host_name_els){
        el.innerText=new_name;
    }
    if(view_type=='host'){
        let name_tb = document.getElementById('name_textbox');
        name_tb.value=new_name;
    }
}

function update_guest_name(new_name){
    let host_name_els = document.getElementsByClassName('guest_name');
    for(let el of host_name_els){
        el.innerText=new_name;
    }
    if(view_type=='join'){
        let name_tb = document.getElementById('name_textbox');
        name_tb.value=new_name;
    }
}

function create_icon_div(icon_div_template){

    let img_src = icon_div_template.getElementsByTagName('img')[0].src;
    let host_ban_overlay_img_src = icon_div_template.getElementsByClassName('ban_host_overlay')[0].src;
    let guest_ban_overlay_img_src = icon_div_template.getElementsByClassName('ban_guest_overlay')[0].src;
    let img_classes = icon_div_template.getElementsByTagName('img')[0].classList;
    let icon_text = icon_div_template.getElementsByTagName('p')[0].innerText;

    // hack to change the ban overlay for an instaban
    // means that create_icon_div can only be used to create icon_div for instaban
    // cross your fingers
    host_ban_overlay_img_src = host_ban_overlay_img_src.replace('ban_', 'instaban_')
    guest_ban_overlay_img_src = guest_ban_overlay_img_src.replace('ban_', 'instaban_')

    let icon_img = document.createElement('img');
    icon_img.src = img_src;
    icon_img.classList.add(img_classes);

    let host_ban_overlay = document.createElement('img');
    host_ban_overlay.src = host_ban_overlay_img_src;
    host_ban_overlay.classList.add('ban_host_overlay');

    let guest_ban_overlay = document.createElement('img');
    guest_ban_overlay.src = guest_ban_overlay_img_src;
    guest_ban_overlay.classList.add('ban_guest_overlay');

    let icon_label = document.createElement('p');
    icon_label.classList.add('label_text');
    icon_label.innerText = icon_text;

    let icon_div = document.createElement('div');
    icon_div.classList.add('icon_div');
    let subicon_div = document.createElement('div');
    subicon_div.classList.add('subicon_div');
    icon_div.appendChild(subicon_div);
    subicon_div.appendChild(icon_img);
    subicon_div.appendChild(host_ban_overlay);
    subicon_div.appendChild(guest_ban_overlay);
    icon_div.appendChild(icon_label);
    return icon_div;
}