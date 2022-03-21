import fetch from 'node-fetch'
import { Headers } from 'node-fetch';
import { FormData } from 'node-fetch';
import fs from 'fs'

var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("Authorization", "Bearer BQDrH2nZZ14OTcXhDrCXEDvpW5dtRErL672X5MNIMwrzCcY3bzgnDkekqL7xEP75tCftS05t_H0XxQH9aL1osoTSYPQZcbrcqCwPnRa0eszYCfh_paZ6AVGElOITSqyevr0lOxDyyw3ULMvM-vvHONsKQgBKwBhAF8dhdjo0fq1XMQuekVDk-tSvJo7X9e5z0vz6FH6O-Z0cVO1znUEg4FLoTaN3mFa3Vo05ItTYuoWR");

var formdata = new FormData();

var requestOptions = {
  method: 'GET',
  headers: myHeaders,
  redirect: 'follow'
};

const data = [];

const userData = [];

const playListID = [];

fetch("https://api.spotify.com/v1/playlists/2yGaAFCB7mwH4m5SEKNO5S", requestOptions)
  .then(response => response.text())
  .then(result => {
      let res = JSON.parse(result);
      let size = res.tracks.items.length;
      for (let i = 0; i < res.tracks.items.length; i++) {
         data.push(res.tracks.items[i]);     
      }
      userData.push(res.owner.id);
      userData.push(res.name);
      loop(size);
  })
  .catch(error => console.log('error', error));

function loop(totalSize) {
    fetch("https://api.spotify.com/v1/playlists/2yGaAFCB7mwH4m5SEKNO5S/tracks?limit=100&offset=" + totalSize, requestOptions)
    .then(response => response.text())
    .then(result => {
        let res = JSON.parse(result);
        let size = res.items.length;
        if (size > 0) {
            for (let i = 0; i < res.items.length; i++) {
                data.push(res.items[i]);
            }
            loop(totalSize + size);
        } else {
            createNewPlaylist();
        }
    })
    .catch(error => console.log('error', error));
}

function createNewPlaylist() {
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
        playListID.push(JSON.parse(result).id);
        shuffle();
    });
}

function shuffle() {
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
        console.log(sendURIs);
        console.log(sendURIs.length)
        let requestOpt = {
            method: "POST",
            headers: myHeaders,
            body: JSON.stringify({
                uris: sendURIs
            })
        };
        fetch("https://api.spotify.com/v1/playlists/" + playListID[0] + "/tracks", requestOpt)
        .then(response => response.text())
        .then(result => {
            //console.log(JSON.parse(result));
        })
    }
}