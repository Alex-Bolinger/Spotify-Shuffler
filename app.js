const SpotifyApi = require('spotify-web-api-node');

const spotifyApi = SpotifyApi({
    clientId: '6efee3b755b94846aea5a6a7cb8bca61',
    clientSecret: '19d6f6eea72649bba6521c67e73bb02b',
    redirect_uri: "//spotify-shuffler3514.herokuapp.com/"
});

spotifyApi.setAccessToken('BQBxtStR6D4dWTKRCo7Z2ZMqRn686Wlaotgphp5H4yBzFqIqf5-6wRDb5NJP5f5u-HT6keXRtxhek18vQ59SReoFEb1HybJ38HeUw-2Y7MnuJKC73WufHx0JitoZ7-28ab-9VD_fdxik2FSrW9JWXK_4E-fL8thVwL6zGEupJ8R9tH-9E9jr6T5bZJd2gWFt0Viva9aEVZgN8Lib160jQCICxcoNXDki1FsPirwLWLJr')

spotifyApi.getPlaylist('2yGaAFCB7mwH4m5SEKNO5S', function(data) {
    console.log(data);
})