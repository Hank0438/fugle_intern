var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var Promise = require('bluebird');
var request = require('request-promise');
var _ = require("lodash");
var moment = require("moment");
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var fs = require('fs');

var url = "http://mops.twse.com.tw/mops/web/t100sb02_1";
var type = ["sii","otc","rotc","pub"];
var month = ["01","02","03","04","05","06","07","08","09","10","11","12"];
// var payload = [];
var eventsArr = [];
var command = process.argv[2];
var cal_test = "8h6hh0pnfol59fshksuoiqf120@group.calendar.google.com";
var options = {
            method: 'POST',
            uri: url,
            form: "payload",
            headers: {
                'cache-control': "no-cache",
                'postman-token': "d318ad7b-873e-5811-9e04-b3799655aaf8",
                'content-type': "application/x-www-form-urlencoded"
            }
};

var crawler = function(payload){
    return request(options)
        .then(function (body) {
            var ss = ["even","odd"];
            var $ = cheerio.load(body);
            ss.forEach(function(z){
                $("tr")
                .filter(function(i, el){
                    return $(this).attr('class') === z;
                })
                .map(function(i, el) {
                    var code = $(this).children().eq(0).text();
                    var name = $(this).children().eq(1).text();
                    var date = $(this).children().eq(2).text();
                    var time = $(this).children().eq(3).text();
                    var location = $(this).children().eq(4).text();
                    var descript = $(this).children().eq(5).text();
                    date = date.replace("105","2016");
                    date = date.replace("/","-")
                    date = date.replace("/","-")
                    if(date.length != 10) date = date.replace(date.slice(10,25),"");
                    var event = {
                        'summary': code + name,
                        'location': location,
                        'description': descript,
                        'start': {
                            'dateTime': date +'T'+ time +':00+08:00',
                            'timeZone': 'Asia/Taipei',
                        },
                        'end': {
                            'dateTime': date +'T'+ time +':00+08:00',
                            'timeZone': 'Asia/Taipei',
                        },
                    };
                    console.log(event.start.dateTime + event.summary);
                    eventsArr.push(event);
                });
            });
        })
        .catch(function (err) {
            console.log("err : "+ err);// POST failed...
        });
}

function go(){
    return Promise.each(month, function(mo){
        return Promise.each(type, function(ty){
            return Promise.delay(3000).then(function(){
                return new Promise(function(resolve,reject){
                    var payload = "encodeURIComponent=1&step=1&firstin=1&off=1&TYPEK="+ty+"&year=105&month="+mo+"&co_id=";
                    options.form = payload;
                    crawler(payload);
                    resolve(ty+mo)
                }).then(function(res){
                    console.log(res);
                })
            });
        });
    });
};

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

function start(){
    // Load client secrets from a local file.
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Calendar API.
        console.log("event is start");
        authorize(JSON.parse(content), listEvents);
    });
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client, command);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth, command) {
    var calendar = google.calendar('v3');
    // var calendarId = "u6467sf3hkhgh2vtpje7pcuk9s@group.calendar.google.com";
    var cal_test = "8h6hh0pnfol59fshksuoiqf120@group.calendar.google.com";
    calendarId = cal_test;
    var eventid = [];

    function list(page_token){
        console.log("list is starting");
        calendar.events.list({
            auth: auth,
            calendarId: calendarId,
            pageToken: page_token
        }, function(err, res) {
            var events = res.items;
            events.forEach(function(e){
                console.log(e.start.dateTime + e.summary);
                eventid.push(e.id);
            });
            page_token = res.nextPageToken;
            // console.log("eventid.length : " + eventid.length);
            // console.log("page_token : " + page_token);
            if(page_token){
                list(page_token);
            }else{
                if(command === "delete"){
                    dele();
                }
                else{
                    console.log("list is done");
                    return;
                };
            }
        });        
    }

    function dele(){
        console.log("delete is starting");
        return Promise.each(eventid, function(id){
            return Promise.delay(500).then(function(){
                return new Promise(function(resolve, reject){
                    calendar.events.delete({
                        auth: auth,
                        calendarId : calendarId,
                        eventId : id
                    }, function(err, res) {
                        if (err) {
                            reject(err);
                        }else{
                            resolve(res)
                        }
                    });
                }).catch(function(err){
                    console.log('There was an error contacting the Calendar service: ' + err);
                });
            });
        }).then(function(){
            console.log("delete is done");
        });
    }

    function insert(){
        console.log("insert is starting");
        return Promise.each(eventsArr, function(event){
            return Promise.delay(500).then(function(){
                return new Promise(function(resolve, reject){
                    console.log(event.start.dateTime + event.summary);
                    calendar.events.insert({
                        auth : auth,
                        calendarId : calendarId,
                        resource : event
                    }, function(err, res) {
                        if (err) {
                            reject(err);
                        }else{
                            resolve(res)
                        }
                    });
                }).catch(function(err){
                    console.log('There was an error contacting the Calendar service: ' + err);
                });
            });
        }).then(function(){
            console.log("insert is done");
        });
    }    

    if(command === "list" || command === "delete") list(undefined);
    if(command === "insert"){
        go().then(function(){
            insert();
        }); 
    } ;
}

start();