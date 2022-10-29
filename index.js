import express from 'express' // Express web server framework
import request from 'request' // "Request" library
import querystring from 'querystring'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import { Headers } from 'node-fetch';
import randomString from './helpers/randomString.js'
import { Worker } from 'worker_threads'

var client_id = '6efee3b755b94846aea5a6a7cb8bca61'; // Your client id
var client_secret = '19d6f6eea72649bba6521c67e73bb02b'; // Your secret
var redirect_uri = 'https://spotify-shuffler.uc.r.appspot.com/callback'; // Your redirect uri
var stateKey = 'spotify_auth_state';
var scope = 'user-read-private playlist-modify-private playlist-read-collaborative playlist-read-private playlist-modify-public';

var app = express();

app.use(express.static(path.dirname(fileURLToPath(import.meta.url)) + '/public'));

app.get("/", function(req,res) {
    res.redirect("/login");
})

app.get('/select', function(req, res) {
    res.sendFile(path.dirname(fileURLToPath(import.meta.url)) + "/public/select.html", err => {
        if (err != null) {
            console.log(err);
        }
    })
})

app.get('/login', function(req, res) {
    var state = randomString(16);
    res.cookie(stateKey, state);
  
    // your application requests authorization
    var scope = 'user-read-private playlist-modify-private playlist-read-collaborative playlist-read-private playlist-modify-public';
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      }));
  });

  app.get("/callback", function(req,res) {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/select#' +
        querystring.stringify({
            error: 'state_mismatch'
        }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                refresh_token = body.refresh_token;

                var options = {
                url: 'https://api.spotify.com/v1/me',
                headers: { 'Authorization': 'Bearer ' + access_token },
                json: true
            };

        // use the access token to access the Spotify Web API
            request.get(options, function(error, response, body) {
                console.log(body);
            });

        // we can also pass the token to the browser to make requests from there
            res.redirect('/select#' +
            querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token
            }));
        } else {
            res.redirect('/select#' +
            querystring.stringify({
                error: 'invalid_token'
            }));
        }
        });
    }
  })

  app.post("/shuffle", function(req,res) {
    let playlistID = req.query.id;
    let access_token = req.query.access_token;
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "Bearer " + access_token);
    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
      };
    var userData = [];
    var data = [];
    const worker = new Worker("./helpers/shuffle.js");

    fetch("https://api.spotify.com/v1/playlists/" + playlistID, requestOptions)
    .then(response => response.text())
    .then(result => {
        let res = JSON.parse(result);
        let size = res.tracks.items.length;
        for (let i = 0; i < res.tracks.items.length; i++) {
            data.push(res.tracks.items[i]);     
        }
        userData.push(res.owner.id);
        userData.push(res.name);
        userData.push(playlistID);
        worker.postMessage([size, requestOptions, myHeaders, data, userData]);
    })
    .catch(error => {
        console.log(error);
    });


    console.log("started shuffle");
    worker.on("message", (msg) => {
        console.log("shuffle completed");
    });
    res.redirect("/select");
  })


  app.listen(process.env.PORT || 8080, () => {
    console.log(`App listening on port ${process.env.PORT || 8080}`);
  })
