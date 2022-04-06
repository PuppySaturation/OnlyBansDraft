from quart import Quart, render_template, url_for, redirect, app, websocket
import os
import re
import tempfile
import json
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


def load_draft_file(draft_id):
    data_path = os.path.join(app.root_path, 'data/', f'bans_{draft_id}.json')
    #with filelock.SoftFileLock(data_path):
    draft_json = json.load(open(data_path, 'r'))
    return draft_json


def update_draft_file(draft_id, draft_json):
    data_path = os.path.join(app.root_path, 'data/', f'bans_{draft_id}.json')
    #with filelock.SoftFileLock(data_path):
    draft_json_old = json.load(open(data_path, 'r'))
    draft_json_old.update(draft_json)
    json.dump(draft_json_old, open(data_path, 'w'))


@app.route("/")
async def index():
    return await render_template("index.html")


@app.route("/new/<string:draft_template>")
async def new_draft(draft_template):
    draft_json = {
        'template': draft_template,
        'rounds': 0,
        'map_bans':0,
        'civ_bans':0,
        'insta_bans':0,
        'host_bans': None,
        'guest_bans': None,
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
async def host_draft(draft_id):
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
async def join_draft(draft_id):
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
async def watch_draft(draft_id):
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

def validate_bans(draft_json, bans_json):
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

@app.websocket('/host/ws/<string:draft_id>')
async def host_ws(draft_id):
    draft_json = load_draft_file(draft_id)
    await websocket.send_json(draft_json)
    while not draft_json['host_bans']:
        bans_json = await websocket.receive_json()
        print(f'host received:{bans_json}')
        validation_res = validate_bans(draft_json, bans_json)
        if not validation_res:
            draft_json['host_bans'] = bans_json
            update_draft_file(draft_id, draft_json)
            await websocket.send_json({'response': 'ok'})
        else:
            await websocket.send_json({'response': validation_res})

@app.websocket('/join/ws/<string:draft_id>')
async def join_ws(draft_id):
    draft_json = load_draft_file(draft_id)
    await websocket.send_json(draft_json)
    while not draft_json['guest_bans']:
        bans_json = await websocket.receive_json()
        print(f'host received:{bans_json}')
        validation_res = validate_bans(draft_json, bans_json)
        if not validation_res:
            draft_json['guest_bans'] = bans_json
            update_draft_file(draft_id, draft_json)
            await websocket.send_json({'response': 'ok'})
        else:
            await websocket.send_json({'response': validation_res})

@app.websocket('/watch/ws/<string:draft_id>')
async def watch_ws(draft_id):
    pass


if __name__ == "__main__":
    app.run()
