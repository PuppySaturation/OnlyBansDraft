from quart import Quart, render_template, url_for, redirect, app
import os
import re
import tempfile
import json

maps_icon_list = {
    'acropolis' : 'MapsIcons/rm_acropolis.png',
    'african_clearing' : 'MapsIcons/rm_african_clearing.png',
    'arabia' : 'MapsIcons/rm_arabia.png',
    'arena' : 'MapsIcons/rm_arena.png',
    'fortress' : 'MapsIcons/rm_fortress.png',
    'golden_pit' : 'MapsIcons/rm_golden-pit.png',
    'gold_rusn' : 'MapsIcons/rm_gold-rush.png',
    'hideout' : 'MapsIcons/rm_hideout.png',
    'land_madness' : 'MapsIcons/rm_land_madness.png',
    'megarandom' : 'MapsIcons/rm_megarandom.png',
    'nomad' : 'MapsIcons/rm_nomad.png',
    'runestones' : 'MapsIcons/rm_runestones.png',
    'socotra' : 'MapsIcons/rm_socotra.png',
}
civs_icon_list  = {
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

@app.route("/")
async def index():
    return await render_template("index.html")

@app.route("/new/<string:draft_template>")
async def new_draft(draft_template):
    if draft_template == 'bo3':
        pass
    elif draft_template == 'bo5':
        pass
    elif draft_template == 'bo7':
        pass
    else:
        return f'No template for: "{draft_template}"', 404

    data_dir = os.path.join(app.root_path, 'data/')
    if not os.path.exists(data_dir):
        os.mkdir(data_dir)

    file_desc, file_path = tempfile.mkstemp(prefix='bans_', suffix='.json', dir=data_dir)
    file_obj = os.fdopen(file_desc, 'w')
    code_match = re.match('.*data/bans_(.+)\.json', file_path)
    if not code_match:
        raise Exception(f'data file doesnt match expected format: {file_path}')
    draft_id = code_match.groups()[0]
    draft_json = {
        'template':draft_template,
        'draft_id':draft_id,
    }

    json.dump(draft_json, file_obj)

    return redirect(url_for(f'host_draft',draft_id=draft_id))


@app.route("/host/<string:draft_id>")
async def host_draft(draft_id):
    template_params = {
        'type': 'host',
        'draft_id': draft_id,
        'maps_list': maps_icon_list,
        'civs_list': civs_icon_list,
        'rounds': 7,
        'map_bans': 3,
        'civ_bans': 7,
        'insta_bans': 2,
    }
    return await render_template("bans.html", **template_params)


@app.route("/join/<string:draft_id>")
async def join_draft(draft_id):
    template_params = {
        'type': 'join',
        'draft_id': draft_id,
        'maps_list': maps_icon_list,
        'civs_list': civs_icon_list,
        'rounds': 7,
        'map_bans': 3,
        'civ_bans': 7,
        'insta_bans': 2,
    }
    return await render_template("bans.html", **template_params)

@app.route("/watch/<string:draft_id>")
async def watch_draft(draft_id):
    template_params = {
        'type': 'watch',
        'draft_id': draft_id,
        'maps_list': maps_icon_list,
        'civs_list': civs_icon_list,
        'rounds': 7,
        'map_bans': 3,
        'civ_bans': 7,
        'insta_bans': 2,
    }
    return await render_template("bans.html", **template_params)

@app.websocket('/host/ws/<string:draft_id>')
async def host_ws(draft_id):
    pass

@app.websocket('/join/ws/<string:draft_id>')
async def join_ws(draft_id):
    pass

@app.websocket('/watch/ws/<string:draft_id>')
async def watch_ws(draft_id):
    pass


if __name__ == "__main__":
    app.run()
