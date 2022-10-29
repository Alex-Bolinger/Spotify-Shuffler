import express from 'express' // Express web server framework
import request from 'request' // "Request" library
import cors from 'cors'
import querystring from 'querystring'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import { Headers } from 'node-fetch';
import { FormData } from 'node-fetch';

var client_id = '6efee3b755b94846aea5a6a7cb8bca61'; // Your client id
var client_secret = '19d6f6eea72649bba6521c67e73bb02b'; // Your secret
var redirect_uri = 'https://spotify-shuffler.uc.r.appspot.com/'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(path.dirname(fileURLToPath(import.meta.url)) + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
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

app.get('/', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter
  if (req.query.code != undefined) {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
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
            res.redirect('/#' +
            querystring.stringify({
                error: 'invalid_token'
            }));
        }
        });
    }
  } else {
      res.redirect('/select');
  }
});

app.get('/select', function(req, res) {
    res.sendFile(path.dirname(fileURLToPath(import.meta.url)) + "/public/select.html", err => {
        if (err != null) {
            console.log(err);
        }
    })
})

app.post('/shuffle', function(req, res) {
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
    var success;

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
        success = loop(size, requestOptions, myHeaders, data, userData);
    })
    .catch(error => {
        console.log(error);
    });
})

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

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
    return 200;
}

console.log('Listening on $PORT');
app.listen(process.env.PORT);
