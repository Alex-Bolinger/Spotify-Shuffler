import {parentPort} from 'worker_threads'

parentPort.on("message", (msg) => {
    loop(msg[0],msg[1],msg[2],msg[3],msg[4]);
})


function loop(totalSize, requestOptions, myHeaders, data, userData) {
    fetch("https://api.spotify.com/v1/playlists/" + userData[2] + "/tracks?limit=100&offset=" + totalSize, requestOptions)
    .then(response => response.text())
    .then(result => {
        let res = JSON.parse(result);
        let size = res.items.length;
        if (size > 0) {
            for (let i = 0; i < res.items.length; i++) {
                data.push(res.items[i]);
            }
            return loop(totalSize + size, requestOptions, myHeaders, data, userData);
        } else {
            return createNewPlaylist(myHeaders, data, userData);
        }
    })
    .catch(error => {
        return 400;
    });
}

function createNewPlaylist(myHeaders, data, userData) {
    let requestOpt = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify({
            name: userData[1] + " - SHUFFLED",
            public: false,
            collaborative: false
        }),
        redirect: 'follow'
      }
    fetch("https://api.spotify.com/v1/users/" + userData[0] + "/playlists", requestOpt)
    .then(response => response.text())
    .then(result => {
        //console.log(JSON.parse(result));
        userData.push(JSON.parse(result).id);
        return shuffle(myHeaders, data, userData);
    });
}

function shuffle(myHeaders, data, userData) {
    var newOrder = [];
    for (let i = 0; i < data.length; i++) {
        newOrder[i] = null;
    }

    for (let i = 0; i < newOrder.length; i++) {
        let newIndex = Math.floor(Math.random() * newOrder.length);
        while (newIndex != -1) {
            if (newOrder[newIndex] == null) {
                newOrder[newIndex] = data[i];
                newIndex = -1;
            } else {
                if (newIndex < newOrder.length - 1) {
                    newIndex++;
                } else {
                    newIndex = 0;
                }
            }
        } 
    }
    let uris = [];
    for (let i = 0; i < newOrder.length; i++) {
        uris.push(newOrder[i].track.uri);
    }
    //console.log(playListID[0]);
    let reqCount = Math.floor(newOrder.length / 100);
    if (newOrder.length % 100 > 0) {
        reqCount++;
    }
    for (let i = 0; i < reqCount; i++) {
        let sendURIs = [];
        for (let j = i *  100; j < i * 100 + 100; j++) {
            if (uris[j] != undefined) {
                sendURIs[j - i * 100] = uris[j];
            }
        }
        //console.log(sendURIs);
        //console.log(sendURIs.length)
        let requestOpt = {
            method: "POST",
            headers: myHeaders,
            body: JSON.stringify({
                uris: sendURIs
            })
        };
        fetch("https://api.spotify.com/v1/playlists/" + userData[3] + "/tracks", requestOpt)
        .then(response => response.text())
        .then(result => {
            console.log(JSON.parse(result));
        })
    }
    parentPort.postMessage(1);
}