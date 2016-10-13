var tmi = require('tmi.js');
var config = require('./config');

const BeamClientNode = require('beam-client-node');
const BeamSocketNode = require('beam-client-node/lib/ws');

var options = {
	options: {
		debug: true
	},
	connection: {
		cluster: "aws",
		reconnect: true
	},
	identity: {
		username: config.twitch.userName,
		password: config.twitch.password
	},
	channels: [config.twitch.channelName]
};

let userInfo;

var twitchClient = new tmi.client(options);
twitchClient.connect();

var beamClient = new BeamClientNode();

beamClient.use('password', {
	username: config.beam.userName,
	password: config.beam.password
})
.attempt()
.then(response => {
	userInfo = response.body;
	return beamClient.chat.join(config.beam.channelId);
})
.then(response => {
	const beamSocket = new BeamSocketNode(response.body.endpoints).boot();
	
	// Copy chat to twitch
	beamSocket.on('ChatMessage', data => {
		if (config.beam.userName.toLowerCase() != data.user_name.toLowerCase()) {
			twitchClient.say(config.twitch.channelName, '[Beam - ' + data.user_name + ']: ' + data.message.message[0].data);
		}
	});
	
	// Copy chat to beam
	twitchClient.on('chat', function(channel, user, message, self) {
		if ( options.identity.username != user['display-name'] ) {
			beamSocket.call('msg', ['[Twitch - ' + user['display-name'] + ']: ' + message]);
		}
	});
	
	// Handle errors
    beamSocket.on('error', error => {
        console.error('Socket error', error);
    });
	
	return beamSocket.auth(config.beam.channelId, userInfo.id, response.body.authkey)
    .then(() => {
        console.log('Beam Login successful');
    });
	
})
.catch(error => {
    console.log('Something went wrong:', error);
});

twitchClient.on('connected', function(address, port) {
	console.log("Address: " + address + " on Port: " + port);
});