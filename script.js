// VARIABLES
var logFile
var gameFile = 'games/game1.ADM'
var gamePlayers
var gameFlags = {}
var gameStart
var logFirst
var logLast
var play = null


// FUNCTIONS

function loadLogs(file) {
    
    var xhr = new XMLHttpRequest();
    // xhr.timeout = 4000;
    xhr.open('GET', file, false);
    xhr.send();

    if (xhr.readyState == 4 && xhr.status == 200) {

        return xhr.responseText
        
    }
}

function getLogs() {

    var logs = {}

    if(typeof logFile == 'undefined')
        logFile = loadLogs(gameFile)

    logFile.split("\n").forEach((value, index) => {

        let oneLine = value.split(" | ")
        
        if(oneLine.length > 1) {
            let group = oneLine[0]
            // delete oneLine[0]
            oneLine.splice(0, 1)

            gameStart = parseInt(group.replace(/:/g, ''))

            if(typeof logs[group] == 'undefined')
                logs[group] = []

            logs[group].push(oneLine.join(" "))
        }

    });

    return logs
}

function filterOneLog(text) {

    var regPosition = /<(.*?)>/
    var regDelete = /\(id(.+?)\)/g
    // var regDelete = / *\([^)]*\)*/g
    var regUser = /"(.*?)"/g

    var results = {
        "type": false,
        "text": text.replace(/\(id(.+?)\)/g, '').replace('(DEAD)', ''),
        "icon": "other.png"
    }

    var actions = {
        "flags": {
            "filter": ["conquered", "longer controller"],
            "regDelete": regDelete,
            "regUser": regUser,
            "icon": "fa-map-marker-alt"
        },
        "deaths": {
            "filter": ["killed", "died"],
            "regDelete": regDelete,
            "regUser": regUser,
            "icon": "fa-skull-crossbones"
        },
        "damages": {
            "filter": ["hit by Player"],
            "regDelete": regDelete,
            "regUser": regUser,
            "icon": "fa-crosshairs"
        },
        "zombies": {
            "filter": ["hit by", "consciousness", "unconscious"],
            "regDelete": regDelete,
            "regUser": regUser,
            "icon": "fa-exclamation"
        },
        "constructions": {
            "filter": ["placed"],
            "regDelete": regDelete,
            "regUser": regUser,
            "icon": "fa-campground"
        },
        "connections": {
            "filter": ["connected"],
            "regDelete": regDelete,
            "regUser": regUser,
            "icon": "fa-link"
        },
        "rest": {
            "filter": [" "],
            "regDelete": regDelete,
            "regUser": regUser,
            "icon": "fa-question"
        }
    }
    
    for (var key in actions) {
        for (var filter in actions[key].filter) {
            if(actions[key].filter[filter] !== '' && text.indexOf(actions[key].filter[filter]) > -1) {

                let tagTitle = ""
                let tagUser = text.match(actions[key].regUser)
                if(tagUser != null) {
                    tagUser = text.match(actions[key].regUser)[0].replace(/"/g, "")
                    tagTitle = tagUser

                    if(text.indexOf('died') > -1) {
                        tagTitle += ' po prostu umarł...'
                    }
                    else if(text.indexOf('killed by Player') > -1) {
                        let bron = text.match(/with (.*) from/)[1]
                        let meters = parseInt(text.match(/from (.*) meters/)[1])
                        
                        tagTitle += ' zabity przez ' + text.match(actions[key].regUser)[1] + ' ('+ bron +' '+ meters +'m)'
                    }
                    else if(text.indexOf('killed by Zmb') > -1) {
                        tagTitle += ' zabity przez ' + text.match(/by (.*)/)[1]
                    }
                    else if(text.indexOf('hit by') > -1) {
                        let bron
                        
                        if(text.indexOf('from ') > -1)
                            bron = text.match(/with (.*) from/)[1]
                        else if(text.indexOf('from ') > -1){
                            bron = text.match(/with (.*)/)[1]
                        }
                        else
                            bron = 'gołe pięści'

                        let damage = text.match(/for (.*) damage/)
                        if(damage != null)
                            damage = damage[1]

                        let attacker
                        if(text.indexOf('Zarażony') > -1)
                            attacker = 'Zarażony'
                        else if(text.indexOf('FallDamage') > -1)
                            attacker = 'upadku'
                        else
                            attacker = text.match(actions[key].regUser)[1]

                        tagTitle += ' oberwał od ' + attacker
                        if(damage != null)
                            tagTitle += ' ('+ bron +' '+ damage +'dmg)'
                    }
                    else if(text.indexOf('unconscious') > -1) {
                        tagTitle += ' zemdlał'
                    }
                    else if(text.indexOf('consciousness') > -1) {
                        tagTitle += ' odzyskał przytomność'
                    }
                    else if(text.indexOf('placed') > -1) {
                        tagTitle += ' zbudował ' + text.match(/placed (.*)/)[1]
                    }
                    else if(typeof text.match(actions[key].regUser)[1] !== 'undefined')
                        tagTitle = text.match(actions[key].regUser)[1] + ' --> ' + text.match(actions[key].regUser)[0]

                    tagTitle = tagTitle.replace(/"/g, "")
                }

                results = {
                    "type": key,
                    "text": text.replace(actions[key].regDelete, ''),
                    "tagTitle": tagTitle, 
                    "icon": actions[key].icon,
                    "player": tagUser
                }
                
                if(text.indexOf('pos=<') > -1)
                    results['position'] = text.match(regPosition)[1].split(',', 2)
                
                break;
            }
        }

        if(results.type !== false)
            break;
    }
    
    return results
}

function filterLogs(filters = [], time = false) {
    var logs = getLogs()
    var results = {}
    let first = true
    
    for (var key in logs) {
        logs[key].forEach(value => {
            let filteredLog = filterOneLog(value)
            
            if(
                (filters.includes(filteredLog.type)) 
                // (filters.includes(filteredLog.type) || filters.includes('rest')) 
                && textFilter(filteredLog.text) 
                && playerFilter(filteredLog.text)
            ) {
                logLast = timeDecode(key)
                if(first) {
                    logFirst = timeDecode(key)
                    first = false
                }

                if(timeFilter(key) || time) {
                    if(typeof results[key] == 'undefined')
                        results[key] = []

                    results[key].push(filteredLog)
                }
            }
        })
    }

    return results
}

function getFilters() {
    var inputs = document.getElementsByClassName("show")
    var filters = []

    for (var i = 0; i < inputs.length; i++) {
        if(inputs.item(i).checked)
            filters.push(inputs.item(i).value)
    }
    
    return filters
}

function customFilter(text, search, type) {
    var test = 0
    var filterValue = document.getElementById("custom").value.trim()
    var filter = filterValue.split(';')
    
    if(search.length > 0 && search[0] != '') {
        for(var key2 in search) {
            if(text.indexOf(search[key2].trim()) > -1) {
                test += 1
            }
        }
    }
    else 
        test = 1
    
    if((test > 0 && !type) || (test == search.length && type))
        return true
    else
        return false
}

function textFilter(text) {
    return customFilter(text, document.getElementById("custom").value.trim().split(';'), document.getElementById("customAnd").checked)
}

function playerFilter(text) {

    let playerFilters = document.querySelectorAll(".player")
    let players = []
    
    playerFilters.forEach(function(item) {
        if(item.checked)
            players.push(item.value)
    });

    return customFilter(text, players, false)
}

function timeDecode(time) {
    time = parseInt(time.replace(/:/g, ''))

    if(time < gameStart)
        time += 1000000

    return time
}

function timeEncode(time) {
    if(time) {
        if(time > 999999)
            time -= 1000000

        time = '000000' + time.toString()
        
        time = time.substr(-6, 2)+':'+time.substr(-4, 2)+':'+time.substr(-2, 2)
    }

    return time
}

function timeFilter(time) {
    let test = true

    if(document.getElementById('time').value != '') {

        let timeFilters = timeDecode(document.getElementById('time').value)
        time = timeDecode(time)
        
        if(timeFilters != '' && timeFilters < time)
            test = false
        else 
            test = true
    }

    return test
}

function calculatePosition(axis, position, mapWidth=1400, mapHeight=856) {

    if(axis == 'x')
        return (parseInt(position) - 9783) * (mapWidth / 5573) - 20
    else
        return Math.abs(mapHeight - (parseInt(position) - 11973) * (mapHeight / 3382)) - 40

}

function clearTags() {
    var elements = document.getElementsByClassName("tag");
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
}

function addTag(position, icon, title, player, visit = false) {
    var x = calculatePosition('x', position[0])
    var y = calculatePosition('y', position[1])
    var classes = 'event'
    var color = 'black'
    
    if(typeof player != 'undefined' && typeof gamePlayers[player] != 'undefined') {
        color = gamePlayers[player].color
        
        if(visit) {
            classes = 'visited'
            x -= 10 + position[2]
            y -= 2 + position[3]
        }
    }

    var tag = '<span class="tag '+classes+'" title="'+ title +'" style="left: '+ x +'px; top: '+ y +'px;">';

    if(typeof icon != 'undefined' && icon != false) {
        if(icon.indexOf('fa-') > -1)
            tag += '<i class="fas '+ icon +'" style="color: '+color+';"></i>'
        else if(icon.indexOf('<svg ') > -1)
            tag += icon
        else 
            tag += '<img src="img/'+ icon +'" />'
    }
    else {
        tag += '<span class="" style="background-color:'+color+';"></span>'
    }

    tag += '</span>'

    document.getElementById('map').innerHTML += tag

}

function updateConsole() {
    var filters = getFilters()
    var logs = filterLogs(filters)
    var html = "" 
    var actualDate = false

    clearTags()
    setFlags()

    for (var key in logs) {

        if(actualDate != key) {
            actualDate = key
            html += "<br /><b>" + actualDate + "</b><br />"
        }
        
        for (var key2 in logs[key]) {
            html += "- " + logs[key][key2].text + "<br />"
            
            if(typeof logs[key][key2].position !== 'undefined')
                addTag(logs[key][key2].position, logs[key][key2].icon, key + ' ' + logs[key][key2].tagTitle, logs[key][key2].player)

            if(logs[key][key2].type == 'flags') {
                let user = logs[key][key2].text.substr(logs[key][key2].text.indexOf('by ') + 3)
                let flag = logs[key][key2].text.match(/\((.*?),/)[1]

                if(logs[key][key2].text.indexOf('no longer controller') > - 1) {
                    gameFlags[flag].owner = ''
                }
                else {
                    gameFlags[flag].owner = user + ' ' + key
                    if(!gameFlags[flag].visited.some(i => i.indexOf(user) > -1) || !document.getElementById('flags_visited').checked) {
                        gameFlags[flag].visited.push(user + ' ' + key)
                    }
                }
            }
        }
    }

    drawFlags()
    updatePlayers()
    
    document.getElementById('results').innerHTML = html
}

function setPlayers() {

    gamePlayers = {}
    let players
    let regexp = /Player "(.*?)"/g
    let colorsPlayers = {
        "MC":"blue",
        "Mardok":"green",
        "Stefan":"red",
        "Jez":"pink",
        "NieWaskiDzik":"fuchsia",
        "Superkomunista":"lime"
    }
    // let colors = ['gray', 'black']

    if(typeof logFile == 'undefined')
        logFile = loadLogs(gameFile)

    players = [...new Set(logFile.match(regexp))]

    for(var key in players) {
        let name = players[key].replace('Player ', '').replace(/"/g, '')
        gamePlayers[name] = {}

        if(colorsPlayers[name])
            gamePlayers[name].color = colorsPlayers[name]
        else
            gamePlayers[name].color = '#' + Math.floor(Math.random()*16777215).toString(16)
            // gamePlayers[key].color = colors.pop()
    }
}

function showPlayers() {

    if(typeof gamePlayers == 'undefined')
        setPlayers()

    for (var key in gamePlayers) {
        let userId = key.replace(/ /g, '_')

        document.getElementById('players').innerHTML += '\
<div class="players color_'+gamePlayers[key].color+'" style="color:'+gamePlayers[key].color+';">\
    <input type="checkbox" id="player_'+userId+'" name="players" class="player" value="'+key+'" checked="checked"\
    style="background-color:'+gamePlayers[key].color+';" />\
    <label for="player_'+userId+'">\
    ' + key + ' (points: <span id="points_'+userId+'">0</span>,\
        active: <span id="active_'+userId+'">0</span>,\
        visited: <span id="visited_'+userId+'">0</span>,\
        first: <span id="first_'+userId+'">0</span>)\
    </label>\
</div>';
    }

    bindChanges('.player')
}

function updatePlayers() {
    for (var key in gamePlayers) {
        gamePlayers[key].active = 0
        gamePlayers[key].visited = 0
        gamePlayers[key].first = 0
    }

    for (var key in gameFlags) {
        if(gameFlags[key].owner != '')
            gamePlayers[gameFlags[key].owner.match(/(.*) /)[1]].active += 1

        let visited = []
        for(var key2 in gameFlags[key].visited) {
            if(key2 == 0)
                gamePlayers[gameFlags[key].visited[key2].match(/(.*) /)[1]].first += 1

            if(!visited.includes(gameFlags[key].visited[key2].match(/(.*) /)[1])) {
                visited.push(gameFlags[key].visited[key2].match(/(.*) /)[1])
                gamePlayers[gameFlags[key].visited[key2].match(/(.*) /)[1]].visited += 1
            }
        }
    }

    for (var key in gamePlayers) {
        let userId = key.replace(/ /g, '_')
        document.getElementById('active_'+userId).innerHTML = gamePlayers[key].active
        document.getElementById('visited_'+userId).innerHTML = gamePlayers[key].visited
        document.getElementById('first_'+userId).innerHTML = gamePlayers[key].first
        document.getElementById('points_'+userId).innerHTML = gamePlayers[key].active + gamePlayers[key].visited + gamePlayers[key].first
    }
}

function bindChanges(classes) {
    const inputs = document.querySelectorAll(classes);

    inputs.forEach(function(item) {
        item.addEventListener('change', (event) => {
            updateConsole()
        });
    });
}

function setFlags() {
    let logs = getLogs()

    for(var key in logs) {
        if(logs[key][0].indexOf('Control point statuses') > -1) {
            for(var key2 in logs[key]) {
                let flag = logs[key][key2].match(/\((.*?)\)/)
                if(flag) {
                    flag = flag[1].split(',')
                    gameFlags[flag[0].trim()] = {
                        "position": [flag[1].trim(), flag[2].trim()],
                        "owner": "",
                        "visited": []
                    }
                }
            }

            break
        }
    }
}

function drawFlags() {
    const flagPin = 'fa-map-marker-alt'
    const flagPin2 = '\
<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\
    width="100%" height="100%" viewBox="0 0 425.963 425.963" style="enable-background:new 0 0 425.963 425.963; %color%"\
    xml:space="preserve">\
<g>\
   <path d="M213.285,0h-0.608C139.114,0,79.268,59.826,79.268,133.361c0,48.202,21.952,111.817,65.246,189.081\
       c32.098,57.281,64.646,101.152,64.972,101.588c0.906,1.217,2.334,1.934,3.847,1.934c0.043,0,0.087,0,0.13-0.002\
       c1.561-0.043,3.002-0.842,3.868-2.143c0.321-0.486,32.637-49.287,64.517-108.976c43.03-80.563,64.848-141.624,64.848-181.482\
       C346.693,59.825,286.846,0,213.285,0z M274.865,136.62c0,34.124-27.761,61.884-61.885,61.884\
       c-34.123,0-61.884-27.761-61.884-61.884s27.761-61.884,61.884-61.884C247.104,74.736,274.865,102.497,274.865,136.62z"/>\
</g>\
</svg>\
</span>'

    for(var key in gameFlags) {
        if(gameFlags[key].owner != '') {
            addTag(
                gameFlags[key].position, 
                flagPin.replace('%color%', 'fill:'+gamePlayers[gameFlags[key].owner.match(/(.*) /)[1]].color+';'), 
                'Flaga ' + gameFlags[key].owner,
                gameFlags[key].owner.match(/(.*) /)[1]
            )
        }

        if(gameFlags[key].visited.length > 0) {
            for(var key2 in gameFlags[key].visited) {
                
                if(!document.getElementById('flags_horizontal').checked) {
                    gameFlags[key].position[2] = 5
                    gameFlags[key].position[3] = key2 * 15 * -1
                }
                else {
                    gameFlags[key].position[2] = key2 * 15 * -1 - 5
                    gameFlags[key].position[3] = -42
                }

                addTag(
                    gameFlags[key].position, 
                    false, 
                    gameFlags[key].visited[key2],
                    gameFlags[key].visited[key2].match(/(.*) /)[1],
                    true
                )
            }
        }
    }
}

function showHide(id) {
    if(document.getElementById(id).style.left == '') {
        document.getElementById(id).style.left = '0px'
        document.getElementById('console').style.top = '0px'
        setTimeout(function() {
            showHide(id)
        }, 100)
        return false
    }
        
    if(document.getElementById(id).style.left != '0px') {
        document.getElementById(id).style.left = '0px'
        document.getElementById('console').style.top = '0px'
    }
    else {
        document.getElementById(id).style.left = '-370px'
        document.getElementById('console').style.top = '865px'
    }
}

function timeNext(back = false) {
    let first = logFirst
    let last = logLast
    if(back) {
        first = logLast
        last = logFirst
    }

    let next = timeEncode(last)

    if(document.getElementById('time').value == '')
        next = timeEncode(first)
    else {
        if(timeDecode(document.getElementById('time').value) == last) {
            timeStop()
            return false
        }

        let logs = filterLogs(getFilters(), true)
        for(var key in logs) {
            if(
                (!back && timeDecode(key) > timeDecode(document.getElementById('time').value))
                || (back && timeDecode(key) == timeDecode(document.getElementById('time').value))
            ) {
                if(!back)
                    next = key
                break
            }
            next = key
        }
    }
    
    document.getElementById('time').value = next

    updateConsole()
}

function timeStop() {
    clearInterval(play)
    play = null
}

function timePlay() {
    let interval = parseFloat(document.getElementById('speed').value) * 1000
    if(isNaN(interval) || interval == 0) {
        interval = 500
        document.getElementById('speed').value = '0.5'
    }

    timeNext()
    play = setInterval(function() {
        timeNext()
    }, interval)
}

function timePlayStop() {
    if(play !== null) {
        timeStop()
    }
    else {
        timePlay()
    }
}


// ACTIONS

bindChanges('.show')

showPlayers()

setFlags()