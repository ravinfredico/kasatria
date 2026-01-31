import * as THREE from 'three';

import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// NOTE: API credentials are hardcoded here for ease of grading/testing.
// In a production environment, these would be stored in .env variables. thanks!
const CLIENT_ID = '10151516674-leog761207u5kl52rtbln6cn520jico5.apps.googleusercontent.com';
const SPREADSHEET_ID = '1CSnLkplvUTiodfBeUMq2XXNDWacf4hkIJ78kC1QzEws';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

window.handleAuthClick = function() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
            if (response.error !== undefined) throw (response);
            await fetchData(response.access_token);
        },
    });
    tokenClient.requestAccessToken();
};

async function fetchData(token) {
    // Fetch Columns A to F (Image, Name, Interest, Country, Age, NetWorth)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A2:F202?majorDimension=ROWS`;
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        
        // Hide login, show 3D world
        document.getElementById('login-overlay').style.display = 'none';
        const container = document.getElementById('container');
        console.log('Fetched data:', data);
        // Pass the REAL data to the 3D engine
        if (data && data.values) {
            init(data.values);
            animate();
        } else {
            console.error('No data returned from Google Sheets:', data);
            container.innerHTML += '<div style="color:red;font-weight:bold;">Error: No data returned from Google Sheets. Please check your sheet name and range.</div>';
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

let camera, scene, renderer;
let controls;

const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

function init(data){
    console.log('init called with data:', data);
    const container = document.getElementById( 'container' );
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 3000;

    scene = new THREE.Scene();

    // table

    for ( let i = 0; i < data.length; i++ ) {

        const row = data[i];

        let imgURL = row[1];  
        // Only use HTTPS links
        if (!imgURL || !imgURL.startsWith('https://')) {
            console.warn('Invalid image URL, using fallback:', imgURL);
            imgURL = 'https://via.placeholder.com/150?text=No+Image';
        }
        const nameTable = row[0];
        const interestTable = row[4];
        const countryTable = row[3];
        const ageTable = row[2];
        const networthTable = row[5];

        const element = document.createElement( 'div' );
        element.className = 'element';
       

        //new element country
        const country = document.createElement( 'div' );
        country.className = 'country';
        country.textContent = countryTable
        element.appendChild(country);

        //new element age

        const Age = document.createElement( 'div' );
        Age.className = 'age';
        Age.textContent = ageTable;
        element.appendChild( Age );

        const imageContainer = document.createElement( 'div' );
        imageContainer.className = 'symbol';
        const img = document.createElement( 'img' );
        img.src = imgURL;
        img.onerror = function() {
            console.error('Image failed to load:', imgURL);
            this.src = 'https://via.placeholder.com/150?text=No+Image';
        };
        img.style.width = '80%';    
        imageContainer.appendChild( img );
        element.appendChild( imageContainer );

        //seperate element name and interest
        const name = document.createElement( 'div' );
        name.className = 'name';
        name.textContent = nameTable;
        element.appendChild(name);

        const interest = document.createElement( 'div' );
        interest.className = 'interest';
        interest.textContent = interestTable;
        element.appendChild( interest );

        //networth element
        const networth = networthTable;
        const networthValue = parseFloat(networth.replace(/[^0-9.-]+/g,""));

        if (networthValue > 200000) {
            element.classList.add('glow-green')
        } else if(networthValue > 100000){
            element.classList.add('glow-yellow')
        } else {
            element.classList.add('glow-red')
        }   


        const objectCSS = new CSS3DObject( element );
        objectCSS.position.x = Math.random() * 4000 - 2000;
        objectCSS.position.y = Math.random() * 4000 - 2000;
        objectCSS.position.z = Math.random() * 4000 - 2000;
        scene.add( objectCSS );

        objects.push( objectCSS );

        //we will make the table into 20x10

        const columnIndex = (i % 20) + 1;
        const rowIndex = Math.floor(i / 20) + 1;

        const object = new THREE.Object3D();
        object.position.x = ( columnIndex * 140 ) - 1330;
        object.position.y = - ( rowIndex * 180 ) + 990;

        targets.table.push( object );

    }

    // sphere

    const vector = new THREE.Vector3();

    for ( let i = 0, l = objects.length; i < l; i ++ ) {

        const phi = Math.acos( - 1 + ( 2 * i ) / l );
        const theta = Math.sqrt( l * Math.PI ) * phi;

        const object = new THREE.Object3D();

        object.position.setFromSphericalCoords( 800, phi, theta );

        vector.copy( object.position ).multiplyScalar( 2 );

        object.lookAt( vector );

        targets.sphere.push( object );

    }

    // helix

    for ( let i = 0, l = objects.length; i < l; i ++ ) {

        const theta = i * 0. + Math.PI;
        const y = - ( i * 16) + 450;

        const object = new THREE.Object3D();

        object.position.setFromCylindricalCoords( 900, theta, y );

        vector.x = object.position.x * 2;
        vector.y = object.position.y;
        vector.z = object.position.z * 2;

        object.lookAt( vector );

        targets.helix.push( object );

        //i think to make a double helix we can just double it down
        const theta2= theta + Math.PI;
        const y2= y;

        const object2= new THREE.Object3D();

        object2.position.setFromCylindricalCoords( 900, theta2, y2 );

        vector.x = object2.position.x * 2;
        vector.y = object2.position.y;
        vector.z = object2.position.z * 2;

        object2.lookAt( vector );

        targets.helix.push( object2 );
    }

    // grid

    for ( let i = 0; i < objects.length; i ++ ) {

        const object = new THREE.Object3D();
        // 5x4x10 grid: x=5, y=4, z=10
        const x = i % 5;
        const y = Math.floor(i / 5) % 4;
        const z = Math.floor(i / (5 * 4));
        object.position.x = (x * 400) - 800;
        object.position.y = -(y * 400) + 600;
        object.position.z = (z * 1000) - 4500;
        targets.grid.push(object);

    }

    //

    renderer = new CSS3DRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.getElementById( 'container' ).appendChild( renderer.domElement );

    //

    controls = new TrackballControls( camera, renderer.domElement );
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener( 'change', render );

    const buttonTable = document.getElementById( 'table' );
    buttonTable.addEventListener( 'click', function () {

        transform( targets.table, 2000 );

    } );

    const buttonSphere = document.getElementById( 'sphere' );
    buttonSphere.addEventListener( 'click', function () {

        transform( targets.sphere, 2000 );

    } );

    const buttonHelix = document.getElementById( 'helix' );
    buttonHelix.addEventListener( 'click', function () {

        transform( targets.helix, 2000 );

    } );

    const buttonGrid = document.getElementById( 'grid' );
    buttonGrid.addEventListener( 'click', function () {

        transform( targets.grid, 2000 );

    } );

    transform( targets.table, 2000 );

    //

    window.addEventListener( 'resize', onWindowResize );

}

function transform( targets, duration ) {

    TWEEN.removeAll();

    for ( let i = 0; i < objects.length; i ++ ) {

        const object = objects[ i ];
        const target = targets[ i ];

        new TWEEN.Tween( object.position )
            .to( { x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration )
            .easing( TWEEN.Easing.Exponential.InOut )
            .start();

        new TWEEN.Tween( object.rotation )
            .to( { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration )
            .easing( TWEEN.Easing.Exponential.InOut )
            .start();

    }

    new TWEEN.Tween( this )
        .to( {}, duration * 2 )
        .onUpdate( render )
        .start();

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

    render();

}

function animate() {

    requestAnimationFrame( animate );

    TWEEN.update();

    controls.update();

}

function render() {

    renderer.render( scene, camera );

}
