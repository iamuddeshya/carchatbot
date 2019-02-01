
'use strict';
const request = require('request');
const constant = require('../constant')

function call(path, payload, callback) {
    const access_token = constant.FB_PAGE_TOKEN;
    const graph_url = 'https://graph.facebook.com/me';

    if (!path) {
        console.error('No endpoint specified on Messenger send!');
        return;
    } else if (!access_token || !graph_url) {
        console.error('No Page access token or graph API url configured!');
        return;
    }

    request({
        uri: graph_url + path,
        qs: { 'access_token': access_token },
        method: 'POST',
        json: payload,
    }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            console.log('Message sent succesfully');
        } else {
            console.error('Error: ' + error);
        }
        callback(body);
    });
};

module.exports = {
    call
};