var baseLayer = new ol.layer.Tile({
    source: new ol.source.OSM({
    /*
    url: 'http://mt{0-3}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attributions: [
      new ol.Attribution({ html: '© Google' }),
      new ol.Attribution({ html: '<a href="https://developers.google.com/maps/terms">Terms of Use.</a>' })
    ]*/
  })
});

var setorSource = new ol.source.ImageWMS({
            url: 'http://localhost:8080/geoserver/popsetores/wms',
            params: {'LAYERS': 'popsetores:setores_censitarios_slz'},
            serverType: 'geoserver'
          });

var setorLayer = new ol.layer.Image({
          source: setorSource 
        });

var pontosSource = new ol.source.ImageWMS({
            url: 'http://localhost:8080/geoserver/slzgeometry/wms',
            params: {'LAYERS': 'slzgeometry:amenities'},
            serverType: 'geoserver'
          });

var pontosLayer = new ol.layer.Image({
          source: pontosSource 
        });

var linhasSource = new ol.source.ImageWMS({
            url: 'http://localhost:8080/geoserver/slzgeometry/wms',
            params: {'LAYERS': 'slzgeometry:roads'},
            serverType: 'geoserver'
          });

var linhasLayer = new ol.layer.Image({
          source: linhasSource 
        });

var poligonosSource = new ol.source.ImageWMS({
            url: 'http://localhost:8080/geoserver/slzgeometry/wms',
            params: {'LAYERS': 'slzgeometry:polygons'},
            serverType: 'geoserver'
          });

var poligonosLayer = new ol.layer.Image({
          source: poligonosSource 
        });

var vector = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: 'yellow',
      width: 2
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: 'red'
      })
    })
  })
});
     
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

var overlay = new ol.Overlay(/** @type {olx.OverlayOptions} */ ({
  element: container,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
}));

closer.onclick = function() {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

var heatmap = new ol.layer.Heatmap({
    source: new ol.source.Vector({
      url: 'http://localhost:8080/geoserver/slzgeometry/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=slzgeometry:amenities&outputFormat=application%2Fjson',
      format: new ol.format.GeoJSON()
    }),
     opacity: 100,
    blur: 50,
    radius: 10
});

var stroke = new ol.style.Stroke({
  color: 'black',
  width: 2
});
var fill = new ol.style.Fill({
  color: 'orange'
});

/*Point Style*/
var style = new ol.style.Style({
  image: new ol.style.Circle({
    radius: 5,
    fill: fill,
    stroke: stroke
  })
});

var styles = [style];

var vector2 = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'http://localhost:8080/geoserver/slzgeometry/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=slzgeometry:amenities&outputFormat=application%2Fjson',
    format: new ol.format.GeoJSON()
  }),
  style: styles,
  updateWhileInteracting: true
});


var selectedStyle = new ol.style.Style({
  image: new ol.style.Circle({
    radius: 5,
    fill: new ol.style.Fill({
      color: 'green'
    }),
    stroke: stroke
  })
});


var intersectionLayer = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: selectedStyle
});

var map = new ol.Map({
  layers: [poligonosLayer, setorLayer,linhasLayer,pontosLayer,baseLayer,vector, vector2, intersectionLayer],
  overlays: [overlay],
  target: 'map',
  view: new ol.View({
    center: new ol.proj.transform([-44.3068, -2.53073], 'EPSG:4326', 'EPSG:3857'),
    zoom: 12
  })
});

var Modify = {
  init: function() {
    this.select = new ol.interaction.Select();
    map.addInteraction(this.select);

    this.modify = new ol.interaction.Modify({
      features: this.select.getFeatures()
    });
    map.addInteraction(this.modify);

    this.setEvents();
  },
  setEvents: function() {
    var selectedFeatures = this.select.getFeatures();

    this.select.on('change:active', function() {
      selectedFeatures.forEach(selectedFeatures.remove, selectedFeatures);
    });
  },
  setActive: function(active) {
    this.select.setActive(active);
    this.modify.setActive(active);
  }
};
Modify.init();

var optionsForm = document.getElementById('options-form');

var Draw = {
  init: function() {
    map.addInteraction(this.Point);
    this.Point.setActive(false);
    map.addInteraction(this.LineString);
    this.LineString.setActive(false);
    map.addInteraction(this.Polygon);
    this.Polygon.setActive(false);
  },
  Point: new ol.interaction.Draw({
    source: vector.getSource(),
    type: /** @type {ol.geom.GeometryType} */ ('Point')
  }),
  LineString: new ol.interaction.Draw({
    source: vector.getSource(),
    type: /** @type {ol.geom.GeometryType} */ ('LineString')
  }),
  Polygon: new ol.interaction.Draw({
    source: vector.getSource(),
    type: /** @type {ol.geom.GeometryType} */ ('Polygon')
  }),
  getActive: function() {
    return this.activeType ? this[this.activeType].getActive() : false;
  },
  setActive: function(active) {
    var type = optionsForm.elements['draw-type'].value;
    if (active) {
      this.activeType && this[this.activeType].setActive(false);
      this[type].setActive(true);
      this.activeType = type;
    } else {
      this.activeType && this[this.activeType].setActive(false);
      this.activeType = null;
    }
  }
};
Draw.init();


/**
 * Let user change the geometry type.
 * @param {Event} e Change event.
 */
optionsForm.onchange = function(e) {
  var type = e.target.getAttribute('name');
  var value = e.target.value;
  if (type == 'draw-type') {
          map.on('singleclick', function(evt) {
        map.removeOverlay(overlay);
    });

    Draw.getActive() && Draw.setActive(true);
    map.remove.Layer(heatmap);
  } else if (type == 'interaction') {
    if (value == 'modify') {
      Draw.setActive(false);
      Modify.setActive(true);
      map.on('singleclick', function(evt) {
      map.addOverlay(overlay);
      var coordenadas = new ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'); 
      var lon = coordenadas[0];
      var lat = coordenadas[1];
      var viewResolution = map.getView().getResolution();
      var url = pontosSource.getGetFeatureInfoUrl(
          evt.coordinate, viewResolution, 'EPSG:3857',
          {'INFO_FORMAT': 'text/html'});
      var hdms = ol.coordinate.toStringXY(evt.coordinate);
      content.innerHTML = '<p class="header orange-text">Coordenadas</p><code>' + 'Lon: ' + lon + '<br></br> Lat: ' + lat +
          '</code> <br></br> Outros atributos: <iframe seamless src="' + url + '"></iframe> ';
      overlay.setPosition(evt.coordinate);
    });
      map.removeLayer(heatmap);
    } else if (value == 'draw') {
      map.on('singleclick', function(evt) {
        map.removeOverlay(overlay);
    });
      Draw.setActive(true);
      Modify.setActive(false);
      map.removeLayer(heatmap);
    } else if (value == 'heatmap'){
            map.on('singleclick', function(evt) {
        map.removeOverlay(overlay);
    });

      Draw.setActive(false);
      Modify.setActive(false);
      map.addLayer(heatmap);
      //window.alert("Não foi implemtentado :(");


    }
  }
};

Draw.setActive(false);
Modify.setActive(true);

// The snap interaction must be added after the Modify and Draw interactions
// in order for its map browser event handlers to be fired first. Its handlers
// are responsible of doing the snapping.
var snap = new ol.interaction.Snap({
  source: vector.getSource()
});
map.addInteraction(snap);

Draw.Polygon.on('drawstart', function(evt) {
  intersectionLayer.getSource().clear();
});

Draw.Polygon.on('drawend', function(evt) {
  var geojsonFormat = new ol.format.GeoJSON();
  var poly1 = geojsonFormat.writeFeatureObject(evt.feature);
  var extent1 = evt.feature.getGeometry().getExtent();
  var source = vector2.getSource();
  var features = source.getFeatures();
  var start = Date.now();
  features.forEach(function(feature) {
    if (!ol.extent.intersects(extent1, feature.getGeometry().getExtent())) {
      return;
    }
    var poly2 = geojsonFormat.writeFeatureObject(feature);
    var intersection = turf.intersect(poly1, poly2);
    if (intersection) {
      intersectionLayer.getSource().addFeature(geojsonFormat.readFeature(intersection));
    }
  });
  var end = Date.now();
  console.log(end - start);
});

Draw.LineString.on('drawstart', function(evt) {
  intersectionLayer.getSource().clear();
});

Draw.LineString.on('drawend', function(evt) {
  var geojsonFormat = new ol.format.GeoJSON();
  var poly1 = geojsonFormat.writeFeatureObject(evt.feature);
  var extent1 = evt.feature.getGeometry().getExtent();
  var source = vector2.getSource();
  var features = source.getFeatures();
  var start = Date.now();
  features.forEach(function(feature) {
    if (!ol.extent.intersects(extent1, feature.getGeometry().getExtent())) {
      return;
    }
    var poly2 = geojsonFormat.writeFeatureObject(feature);
    var intersection = turf.intersect(poly1, poly2);
    if (intersection) {
      intersectionLayer.getSource().addFeature(geojsonFormat.readFeature(intersection));
    }
  });
  var end = Date.now();
  console.log(end - start);
});

var select = new ol.interaction.Select();
var selectedFeatures = select.getFeatures();

/*
function selectFeatures(){
   
    interaction.on('drawstart',function(event){
 
        drawingSource.clear(); //limpa a forma
        select.setActive(false);  // desativa as features selecionadas
       
        sketch = event.feature;
       
        listener = sketch.getGeometry().on('change',function(event){
            selectedFeatures.clear();
            var geometry = event.target;
            var features = baseLayer.getSource().getFeatures();
 
            for (var i = 0 ; i < features.length; i++){
                if(geometry.intersectsExtent(features[i].getGeometry().getExtent())){
                    selectedFeatures.push(features[i]);
                }
            }
        });
 
    },this);
 
    interaction.on('drawend', function(event) {
        sketch = null;
 
        selectedFeatures.clear();
 
        var geometry = event.feature.getGeometry();
        var features = baseLayer.getSource().getFeatures();
        var info = [];
 
        for (var i = 0 ; i < features.length; i++){
            if(geometry.intersectsExtent(features[i].getGeometry().getExtent())){
                selectedFeatures.push(features[i]);
                info.push(features[i].get('satelite'));
            }
        }
        if (info.length > 0) {
          console.log(info);
        }
    });
}*/