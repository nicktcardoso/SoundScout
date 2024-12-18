require('dotenv').config();
const express = require('express');
const serverless = require("serverless-http");
const axios = require('axios');
const cors = require('cors');
const morgan = require('morgan');
const { configDotenv } = require('dotenv');

const app = express();
//const PORT = 3000;

app.use(cors());

//Spotify credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; //Your redirect URI

const AUTHORIZE = "https://accounts.spotify.com/authorize";
const TOKEN = "https://accounts.spotify.com/api/token";

const SPOTIFY_API = "https://api.spotify.com/v1";

let access_token = null;


function fetchAccessToken(code) {
  let body = "grant_type=authorization_code";
  body += "&code=" + code;
  body += "&redirect_uri=" + encodeURI(REDIRECT_URI);
  body += "&client_id=" + CLIENT_ID;
  body += "&client_secret=" + CLIENT_SECRET;
  callAuthorizationApi(body);
  }
  
  function callAuthorizationApi(body) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", TOKEN, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(CLIENT_ID + ":" + CLIENT_SECRET));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse();
  }
  
  function handleAuthorizationResponse() {
  if (this.status == 200) {
    var data = JSON.parse(this.responseText);
    console.log(data);
    var data = JSON.parse(this.responseText);
    if (data.access_token != undefined) {
      access_token = data.access_token;
    }
    if (data.refresh_token != undefined) {
      refresh_token = data.refresh_token;
    } 
    onPageLoad();
  }
  else {
    console.log(this.responseText);
    alert(this.responseText);
  }
  }
  
  
  //Step 1: Redirect to spotify auth page
  app.get('/login', (req, res) => {
      const scope = "user-follow-read user-top-read user-read-recently-played user-library-read";
      let url = AUTHORIZE;
      url += "?client_id=" + CLIENT_ID;
      url += "&response_type=code";
      url += "&redirect_uri=" + encodeURI(REDIRECT_URI);
      url += "&show_dialog=true";
      url += "&scope=" + encodeURIComponent(scope);
      res.redirect(url);
  });
  

  
   app.get('/callback', async (req, res) => {
  
    const { code } = req.query;
    //res.json( { message: 'Testing queryParams', code});
    if (!code) {
      console.error('Authorization code is missing');
      res.redirect('http://nicktcardoso.com/soundscout');
      return
    }
    
  
    const body = new URLSearchParams({
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
    });
  
    const headers = {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (new Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
    };
  
    try {
        const response = await axios.post(TOKEN, body, { headers });
  
       //res.json( { message: 'Testing response', response});
  
        const { access_token: token, refresh_token, token_type, expires_in } = response.data;
        
        access_token = token;
  
      res.redirect(`https://nicktcardoso.com/soundscout/dashboard/?access_token=${access_token}&refesh_token=${refresh_token}`);
    } catch (error) {
        console.error('Error retrieving access token:', error.response ? error.response.data : error.message);
        res.redirect('/#' + new URLSearchParams({ error: 'invalid_token' }));
    }
  }); 
  
  
  
  //New Code
  app.get('/top-items', async (req, res) => {
    const { type, time_range = 'medium_term', limit = 20, offset = 0 } = req.query;
  
    if (!type || (type !== 'artists' && type !== 'tracks')) {
      return res.status(400).json({ error: 'Invalid type. Use "artists" or "tracks".'})
    }
  
    if (!access_token) {
      return res.status(401).json({ error: 'User not authenticated. Access token is missing'});
    }
  
    try {
      const spotifyApiUrl = `${SPOTIFY_API}/me/top/${type}`;
      const response = await axios.get(spotifyApiUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        params: {
          time_range,
          limit,
          offset,
        },
      });
  
      //send data from spotify back to client
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching top items:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Failed to fetch top items.'});
    }
  
  });
  
  module.exports.handler = serverless(app);