from quart import Quart, render_template, url_for, redirect, app, websocket
import asyncio
import random
from functools import wraps
import os
import re
import tempfile
import json
from typing import Union
import filelock

maps_icon_list = {
    'acropolis' : 'MapsIcons/rm_acropolis.png',
    'african_clearing' : 'MapsIcons/rm_african_clearing.png',
    'arabia' : 'MapsIcons/rm_arabia.png',
    'arena' : 'MapsIcons/rm_arena.png',
    'fortress' : 'MapsIcons/rm_fortress.png',
    'golden_pit' : 'MapsIcons/rm_golden-pit.png',
    'gold_rush' : 'MapsIcons/rm_gold-rush.png',
    'hideout' : 'MapsIcons/rm_hideout.png',
    'land_madness' : 'MapsIcons/rm_land_madness.png',
    'megarandom' : 'MapsIcons/rm_megarandom.png',
    'nomad' : 'MapsIcons/rm_nomad.png',
    'runestones' : 'MapsIcons/rm_runestones.png',
    'socotra' : 'MapsIcons/rm_socotra.png',
}
civs_icon_list = {
    'aztecs' : 'CivIcons/aztecs.png',
    'berbers' : 'CivIcons/berbers.png',
    'bohemians' : 'CivIcons/bohemians.png',
    'britons' : 'CivIcons/britons.png',
    'bulgarians' : 'CivIcons/bulgarians.png',
    'burgundians' : 'CivIcons/burgundians.png',
    'burmese' : 'CivIcons/burmese.png',
    'byzantines' : 'CivIcons/byzantines.png',
    'celts' : 'CivIcons/celts.png',
    'chinese' : 'CivIcons/chinese.png',
    'cumans' : 'CivIcons/cumans.png',
    'ethiopians' : 'CivIcons/ethiopians.png',
    'franks' : 'CivIcons/franks.png',
    'goths' : 'CivIcons/goths.png',
    'huns' : 'CivIcons/huns.png',
    'incas' : 'CivIcons/incas.png',
    'indians' : 'CivIcons/indians.png',
    'italians' : 'CivIcons/italians.png',
    'japanese' : 'CivIcons/japanese.png',
    'khmer' : 'CivIcons/khmer.png',
    'koreans' : 'CivIcons/koreans.png',
    'lithuanians' : 'CivIcons/lithuanians.png',
    'magyars' : 'CivIcons/magyars.png',
    'malay' : 'CivIcons/malay.png',
    'malians' : 'CivIcons/malians.png',
    'mayans' : 'CivIcons/mayans.png',
    'mongols' : 'CivIcons/mongols.png',
    'persians' : 'CivIcons/persians.png',
    'poles' : 'CivIcons/poles.png',
    'portuguese' : 'CivIcons/portuguese.png',
    'saracens' : 'CivIcons/saracens.png',
    'sicilians' : 'CivIcons/sicilians.png',
    'slavs' : 'CivIcons/slavs.png',
    'spanish' : 'CivIcons/spanish.png',
    'tatars' : 'CivIcons/tatars.png',
    'teutons' : 'CivIcons/teutons.png',
    'turks' : 'CivIcons/turks.png',
    'vietnamese' : 'CivIcons/vietnamese.png',
    'vikings' : 'CivIcons/vikings.png',
}

app = Quart(__name__)


def load_draft_file(draft_id: str) -> dict:
    data_path = os.path.join(app.root_path, 'data/', f'bans_{draft_id}.json')
    #with filelock.SoftFileLock(data_path):
    draft_json = json.load(open(data_path, 'r'))
    return draft_json


def update_draft_file(draft_id: str, draft_json: dict) -> dict:
    data_path = os.path.join(app.root_path, 'data/', f'bans_{draft_id}.json')
    draft_json = {k:v for k, v in draft_json.items() if v}

    #with filelock.SoftFileLock(data_path):
    draft_json_new = json.load(open(data_path, 'r'))
    draft_json_new.update(draft_json)
    json.dump(draft_json_new, open(data_path, 'w'))
    return draft_json_new


@app.route("/")
async def index():
    return await render_template("index.html")


@app.route("/new/<string:draft_template>")
async def new_draft(draft_template: str):
    draft_json = {
        'template': draft_template,
        'draft_id': None,
        'rounds': 0,
        'map_bans': 0,
        'civ_bans': 0,
        'insta_bans': 0,
        'draft_stage': 'bans', # bans, waiting_round_N, round_N,
        'actions': [],
    }
    if draft_template == 'bo3':
        draft_json.update({
            'rounds': 3,
            'map_bans': 3,
            'civ_bans': 3,
            'insta_bans': 1,
        })
    elif draft_template == 'bo5':
        draft_json.update({
            'rounds': 5,
            'map_bans': 3,
            'civ_bans': 5,
            'insta_bans': 1,
        })
    elif draft_template == 'bo7':
        draft_json.update({
            'rounds': 7,
            'map_bans': 3,
            'civ_bans': 7,
            'insta_bans': 2,
        })
    else:
        return f'No template for: "{draft_template}"', 404

    data_dir = os.path.join(app.root_path, 'data/')
    if not os.path.exists(data_dir):
        os.mkdir(data_dir)
    file_desc, file_path = tempfile.mkstemp(prefix='bans_', suffix='.json', dir=data_dir)
    file_obj = os.fdopen(file_desc, 'w')
    code_match = re.match('.*data/bans_(.+)\\.json', file_path)
    if not code_match:
        raise Exception(f'data file doesnt match expected format: {file_path}')
    draft_id = code_match.groups()[0]
    draft_json['draft_id'] = draft_id

    json.dump(draft_json, file_obj)
    file_obj.close()

    return redirect(url_for(f'host_draft', draft_id=draft_id))


@app.route("/host/<string:draft_id>")
async def host_draft(draft_id: str):
    draft_json = load_draft_file(draft_id)
    template_params = {
        'type': 'host',
        'draft_id': draft_id,
        'maps_list': maps_icon_list,
        'civs_list': civs_icon_list,
        'rounds': draft_json['rounds'],
        'map_bans': draft_json['map_bans'],
        'civ_bans': draft_json['civ_bans'],
        'insta_bans': draft_json['insta_bans'],
    }
    return await render_template("bans.html", **template_params)


@app.route("/join/<string:draft_id>")
async def join_draft(draft_id: str):
    draft_json = load_draft_file(draft_id)
    template_params = {
        'type': 'join',
        'draft_id': draft_id,
        'maps_list': maps_icon_list,
        'civs_list': civs_icon_list,
        'rounds': draft_json['rounds'],
        'map_bans': draft_json['map_bans'],
        'civ_bans': draft_json['civ_bans'],
        'insta_bans': draft_json['insta_bans'],
    }
    return await render_template("bans.html", **template_params)

@app.route("/watch/<string:draft_id>")
async def watch_draft(draft_id: str):
    draft_json = load_draft_file(draft_id)
    template_params = {
        'type': 'watch',
        'draft_id': draft_id,
        'maps_list': maps_icon_list,
        'civs_list': civs_icon_list,
        'rounds': draft_json['rounds'],
        'map_bans': draft_json['map_bans'],
        'civ_bans': draft_json['civ_bans'],
        'insta_bans': draft_json['insta_bans'],
    }
    return await render_template("bans.html", **template_params)


def validate_bans(draft_json: dict, bans_json: dict) -> Union[str, None]:
    if 'map_bans' not in bans_json:
        return 'missing map_bans'
    if len(bans_json['map_bans']) != draft_json['map_bans']:
        return f'wrong number of map bans: {len(bans_json["map_bans"])}'
    for map_id in bans_json['map_bans']:
        if map_id not in maps_icon_list:
            return f'unrecognized map: {map_id}'
    if 'civ_bans' not in bans_json:
        return 'missing civ_bans'
    if len(bans_json['civ_bans']) != draft_json['civ_bans']:
        return f'wrong number of civ bans: {len(bans_json["civ_bans"])}'
    for civ_id in bans_json['civ_bans']:
        if civ_id not in civs_icon_list:
            return f'unrecognized map: {civ_id}'

    return None


connected_hosts = {}
connected_guests = {}


@app.websocket('/host/ws/<string:draft_id>')
async def host_ws(draft_id: str):
    global connected_hosts, connected_guests
    if draft_id in connected_hosts:
        await websocket.send_json({'response': 'host already connected for this draft'})
        return

    connected_hosts[draft_id] = None
    draft_json = load_draft_file(draft_id)
    try:
        while True:
            recv_json = await websocket.receive_json()
            if 'action' not in recv_json:
                await websocket.send_json({'response': 'invalid json package'})
                continue
            if recv_json['action'] == 'submit_bans':
                # is it the right stage?
                if draft_json['draft_stage'] != 'bans':
                    await websocket.send_json({'response': 'bans cannot be submitted at this stage'})
                # have you submitted bans before?
                if connected_hosts[draft_id]:
                    await websocket.send_json({'response': 'bans submitted, waiting for guest'})
                # are the bans valid?
                valid_resp = validate_bans(draft_json, recv_json)
                if valid_resp is not None:
                    await websocket.send_json({'response': valid_resp})
                    continue
                connected_hosts[draft_id] = recv_json
                await websocket.send_json({'response': 'ok'})

                # has the guest submitted his bans?
                if draft_id in connected_guests and connected_guests[draft_id]:
                    draft_json = await broadcast_bans_update(draft_json)

            elif recv_json['action'] == 'next_round':
                pass
            elif recv_json['action'] == 'insta_ban':
                pass
            elif recv_json['action'] == 'insta_ban':
                pass
    finally:
        connected_hosts.pop(draft_id)


async def broadcast_bans_update(draft_json):
    global connected_hosts, connected_guests
    draft_id = draft_json['draft_id']
    host_bans = connected_hosts[draft_id]
    guest_bans = connected_guests[draft_id]
    connected_hosts[draft_id] = None
    connected_guests[draft_id] = None

    draft_json['available_maps'] = [k for k in maps_icon_list
                                    if k not in host_bans['map_bans']
                                    or k not in guest_bans['map_bans']]
    draft_json['available_civs'] = [k for k in civs_icon_list
                                    if k not in host_bans['civ_bans']
                                    or k not in guest_bans['civ_bans']]

    random.shuffle(draft_json['available_maps'])
    random.shuffle(draft_json['available_civs'])

    action_json = {'action': 'update_bans',
                   'host_bans': host_bans,
                   'guest_bans': guest_bans,
                   }
    draft_json['actions'].append(action_json)
    draft_json['draft_stage'] = 'waiting_round_1'
    draft_json = update_draft_file(draft_id, draft_json)

    await broadcast_update(action_json, draft_json['draft_id'])
    return draft_json

async def broadcast_round_start(draft_json):
    global connected_hosts, connected_guests
    draft_id = draft_json['draft_id']
    connected_hosts[draft_id] = None
    connected_guests[draft_id] = None

    map_id = draft_json['available_maps'].pop()
    host_civ_id = draft_json['available_civs'].pop()
    guest_civ_id = draft_json['available_civs'].pop()

    action_json = {'action': 'start_round',
                   'round_numb': 0,
                   'map': map_id,
                   'host_civ': host_civ_id,
                   'guest_civ': guest_civ_id,
                   }
    draft_json['actions'].append(action_json)

    await broadcast_update(action_json, draft_json['draft_id'])
    return draft_json


@app.websocket('/join/ws/<string:draft_id>')
async def join_ws(draft_id: str):
    global connected_guests
    if draft_id in connected_guests:
        await websocket.send_json({'response': 'guest already connected'})
        return

    connected_guests[draft_id]=None
    draft_json = load_draft_file(draft_id)
    try:
        while True:
            recv_json = await websocket.receive_json()
            if 'action' not in recv_json:
                await websocket.send_json({'response': 'invalid json package'})
                continue
            if recv_json['action'] == 'submit_bans':
                # is it the right stage?
                if draft_json['draft_stage'] != 'bans':
                    await websocket.send_json({'response': 'bans cannot be submitted at this stage'})
                # have you submitted bans before?
                if connected_guests[draft_id]:
                    await websocket.send_json({'response': 'bans submitted, waiting for host'})
                # are the bans valid?
                valid_resp = validate_bans(draft_json, recv_json)
                if valid_resp is not None:
                    await websocket.send_json({'response': valid_resp})
                    continue
                connected_guests[draft_id] = recv_json
                await websocket.send_json({'response': 'ok'})

                # has the guest submitted his bans?
                if draft_id in connected_hosts and connected_hosts[draft_id]:
                    draft_json = await broadcast_bans_update(draft_json)

            elif recv_json['action'] == 'next_round':
                pass
            elif recv_json['action'] == 'insta_ban':
                pass
            elif recv_json['action'] == 'insta_ban':
                pass

    finally:
        connected_guests.pop(draft_id)


connected_watchers = {}


def collect_websocket(func):
    @wraps(func)
    async def wrapper(draft_id):
        global connected_watchers
        queue = asyncio.Queue()

        if draft_id not in connected_watchers:
            connected_watchers[draft_id] = set()
        con_watcher_set = connected_watchers[draft_id]
        con_watcher_set.add(queue)
        try:
            return await func(queue, draft_id)
        finally:
            con_watcher_set.remove(queue)
            if len(con_watcher_set) == 0:
                connected_watchers.pop(draft_id)

    return wrapper


@app.websocket('/watch/ws/<string:draft_id>')
@collect_websocket
async def watch_ws(queue: asyncio.Queue, draft_id: str):
    draft_json = load_draft_file(draft_id)
    await websocket.send_json(draft_json)

    while True:
        data = await queue.get()
        await websocket.send_json(data)


async def broadcast_update(update_json: dict, draft_id: str):
    print("broadcasting")
    con_watch_queues = connected_watchers.get(draft_id)
    if con_watch_queues:
        for queue in con_watch_queues:
            await queue.put(update_json)


if __name__ == "__main__":
    app.run()
