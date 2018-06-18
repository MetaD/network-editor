var hookWindow = false;

$(function() {
    'use strict';


    var userId = sessionStorage.getItem('userId');
    var sid = userId.substring(4);
    var sectionId = sessionStorage.getItem('sectionId')
    var friends_unsplit = sessionStorage.getItem('friends')

    console.log(friends)
    console.log(userId)
    console.log(sid)
    console.log(sectionId)

    var friends = friends_unsplit.split(",")
    // parse id in URL
    /*
    var userId = '';
    var sid = null, sectionId = null;
    var parameters = window.location.search.substring(1);
    if (parameters.length > 17 && parameters.length < 21) {
        userId = parameters.split(/[&=]/)[1];
        sid = userId.substring(4);
        sectionId = parameters[parameters.length - 1];
    }
    */



    if (userId.length < 5 || userId.length > 8 || !userId.startsWith('ucla') ||
        isNaN(sid) || isNaN(sectionId)) {
        $('body').empty();
        return;
    }
    sid = parseInt(sid);
    var nodeName = sid % 2 === 0 ? 'person' : 'airport';
    $('#instr').html('Click "Add Connection" to add connections between ' + (sid % 2 === 0 ? 'people' : 'airports') +
    '.<br/><br/>Click on a connection to edit or remove it.');

    // prevent closing window
    window.onbeforeunload = function() {
        if (hookWindow) {
            return 'Do you want to leave this page? Your progress will not be saved.';
        }
    }

    // initialize firebase
    var config = {
        apiKey: "AIzaSyD1x_G62LDh16lIhg--xKt69N79TgH--l8",
        authDomain: "network-editor.firebaseapp.com",
        databaseURL: "https://network-editor.firebaseio.com",
        projectId: "network-editor",
        storageBucket: "network-editor.appspot.com",
        messagingSenderId: "208552070855"
    };
    firebase.initializeApp(config);

    // construct network
    var IMG_DIR = 'img/'
    var initial_nodes = [];
    var network = null;

    for (var i = 0; i < friends.length; ++i) {
        initial_nodes.push({
            id: i,
            label: friends[i],
            image: IMG_DIR + subject_imgs[sid][sectionId][i][0],
            shape: 'circularImage'
        });
    }
    var data = {nodes: new vis.DataSet(initial_nodes), edges: []};

    function destroy() {
        if (network !== null) {
            network.destroy();
            network = null;
        }
    }

    function draw() {
        destroy();

        // create a network
        var container = document.getElementById('network-wrapper');
        var options = {
            locale: 'custom',
            locales: {
                'custom': {
                    edit: 'Edit',
                    del: 'Delete selected',
                    back: 'Back',
                    addNode: 'Add ' + nodeName,
                    addEdge: 'Add connection',
                    editNode: 'Edit ' + nodeName,
                    editEdge: 'Edit connection',
                    addDescription: 'Click in an empty space to place a new ' + nodeName + '.',
                    edgeDescription: 'Click on a ' + nodeName + ' and drag the connection to another ' + nodeName + ' to connect them.',
                    editEdgeDescription: 'Click on the control point and drag it to another ' + nodeName + ' to connect to it.',
                    createEdgeError: 'Cannot link connections to a cluster.',
                    deleteClusterError: 'Clusters cannot be deleted.',
                    editClusterError: 'Clusters cannot be edited.'
                }
            },
            manipulation: {
                enabled: true,
                initiallyActive: true,
                addNode: false,
                deleteNode: false,
                controlNodeStyle: {
                    size: 7,
                    color: {
                        background: '#ffc107',
                        border: '#007bff',
                        highlight: {
                            background: '#007bff',
                            border: '#ffc107'
                        },
                    },
                    borderWidth: 3,
                },
                addEdge: function(data, callback) {
                    if (data.from != data.to  &&
                        network.getConnectedNodes(data.from).indexOf(data.to) == -1) {
                        // not the same node and the two nodes are not connected
                        callback(data);
                        $('#submit').removeClass('disabled');
                    }
                    network.addEdgeMode();
                },
                editEdge: function(data, callback) {
                    var original_nodes = network.getConnectedNodes(data.id);
                    var same_nodes = original_nodes.indexOf(data.from) != -1 &&
                                     original_nodes.indexOf(data.to) != -1;
                    var connected = network.getConnectedNodes(data.from).indexOf(data.to) != -1;
                    if (data.from != data.to && (same_nodes || !connected)) {
                        callback(data);  // connect
                    } else {
                        // forbid connecting a node to itself or connecting two nodes that are already connected
                        callback(null);  // cancel
                        network.selectEdges([data.id]);
                        network.editEdgeMode();
                    }
                }
            },
            nodes: {
                shadow: {
                    enabled: true,
                    size: 5,
                    x: 0,
                    y: 0
                },
                chosen: {
                    node: function(values, id, selected, hovering) {
                        values.shadow = true;
                        values.shadowColor = "rgba(0, 0, 0, 0.8)";
                        values.shadowSize = 15;
                        values.shadowX = 0;
                        values.shadowY = 0;
                    }
                },
                font: {  // transparent labels
                    color: '#eeeeee',
                    strokeWidth: 5,
                    strokeColor: 'rgba(0, 0, 0, 0.8)',
                    size: 20,
                    vadjust: -8
                },
                borderWidth: 0,
                size: 60,
                color: '#fff'
            },
            edges: {
                color: {
                    color: '#007bff'
                },
                width: 2,
                chosen: {
                    edge: function(values, id, selected, hovering) {
                        values.color = '#46b8da';
                        values.width = 2.5;
                        values.shadow = true;
                        values.shadowColor = '#007bff';
                        values.shadowX = 0;
                        values.shadowY = 0;
                    }
                }
            },
            physics: {
                forceAtlas2Based: {
                    gravitationalConstant: -40,
                    centralGravity: 0.005,
                    springLength: 200,
                    springConstant: 0.05,
                    avoidOverlap: 1
                },
                solver: 'forceAtlas2Based',
                timestep: 0.75,
                stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 25
                }
            }
        }
        data = {nodes: new vis.DataSet(initial_nodes), edges: []};
        network = new vis.Network(container, data, options);
        network.on('stabilized', function(params) {
            network.fit({ animation: {duration: 500} });
        });
        network.on('selectEdge', function(obj) {
            network.enableEditMode();  // quit addEdgeMode
        });
    }

    // set up buttons
    $('#reset').click(function() {
        draw();
        $('#submit').addClass('disabled');
    });

    $('#submit').click(function() {
        if ($(this).hasClass('disabled')) {
            return;
        }
        var endTime = new Date();
        $('#process-modal').modal('show');

        // get network data
        var positions = network.getPositions();
        var nodes = Object.keys(positions).map(function (key) {
            positions[key].id = key;
            return positions[key];
        });
        nodes.forEach(function(elem, index) {
            elem.connections = network.getConnectedNodes(index);
        });

        // showing node IDs
        var labeled_nodes = Object.assign([], initial_nodes);  // make copy
        for (var i = 0; i < initial_nodes.length; ++i) {
            labeled_nodes[i].label = labeled_nodes[i].id + '\n\n\n\n' + labeled_nodes[i].label;
        }
        data.nodes.update(labeled_nodes);
        network.setOptions({ nodes: { font: { vadjust: -80 } } });

        // send data
        firebase.auth().signInAnonymously().then(function(user) {
            var firebaseUid = user.uid;
            console.log('Signed in as ' + firebaseUid);

            var data = {
                firebase_uid: firebaseUid,
                start_time: startTime.toString(),
                end_time: endTime.toString(),
                duration: endTime.getTime() - startTime.getTime(),
                data: nodes
            };
            var userRef = firebase.database().ref(userId + '/' + sectionId + '/' + data.start_time);
            userRef.set(data).then(function() {
                // success
                // save a network image
                var canvas = $('.vis-network canvas')[0];

                canvas.toBlob(function(blob) {
                    var storageRef = firebase.storage().ref();
                    var path = userId + '_' + sectionId + '_' + startTime.toString() + '.png';
                    storageRef.child(path).put(blob).then(function() {
                        hookWindow = false;
                        firebase.auth().currentUser.delete();
                        $('#process-modal').modal('hide');
                        $('body').empty();
                        $('body').append($('<p>', {
                            text: 'Your response has been recorded. Thank you!',
                            id: 'end-instr'
                        }));
                    }, function() {
                        hookWindow = false;
                        firebase.auth().currentUser.delete();
                        $('#process-modal').modal('hide');
                        alert('The response has been recorded, but the image failed to save. Please right click on the image and save it, or find the experimenter. Thank you!');
                    });
                });
            }, function() {
                $('#process-modal').modal('hide');
                alert('Error: cannot connect to Firebase');
            });

        }, function() {
            $('#process-modal').modal('hide');
            alert('Error: cannot connect to Firebase');
        });
    });

    draw();

    hookWindow = true;
    var startTime = new Date();
});
