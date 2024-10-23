  <!DOCTYPE html>
  <html xmlns="http://www.w3.org/1999/xhtml">
  <head>
      <title></title>
      <link rel="stylesheet" href="OpenLayers/ol.css" />
      <link href="https://stackpath.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet">
      <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script>
      <script type="text/javascript" src="OpenLayers/ol.js"></script>
      <style>
          #map {
              height: 800px;  
              width: 100%;
          }
          .woopwoop {
              max-width: 100% !important;
          }
          .woopwoop h4 {
              padding-left:20px;
              background-repeat: no-repeat;
              background-image: url(https://api.trafikinfo.trafikverket.se/v2/icons/trafficMessage?type=png16x16);
          }
          #popup {
              padding-bottom: 8px;
              width: 800px;
          }
      </style>
  </head>
  <body>
      <div id="map">
          <div id="popup"></div>
      </div>
  
  <script type="text/javascript" >
  
  var apiUrl = "https://api.trafikinfo.trafikverket.se/v2/";
  
  $.support.cors = true; // Enable Cross domain requests
  
  //Initialize the map
  $(document).ready(function () {
      try {
          $.ajaxSetup({
              url: apiUrl + "data.json",
              error: function (msg) {
                  if (msg.statusText == "abort") return;
                  alert("Request failed: " + msg.statusText + "
" + msg.responseText);
              }
          });
      } catch (e) {
          alert("Ett fel uppstod vid initialisering.");
      }
  
      //Creates the OpenLayers map object (http://openlayers.org/en/master/apidoc/ol.Map.html)
      var map = new ol.Map({
          controls: ol.control.defaults().extend([new ol.control.FullScreen()]),
          target: 'map',
          layers: [
              new ol.layer.Tile({
                  source: new ol.source.OSM() //Background layer
              })
          ],
          view: new ol.View({
              center: ol.proj.transform([15, 60], 'EPSG:4326', 'EPSG:3857'), //Transforms coordinates to the coordinate system used by the background layer
              zoom: 4
          })
      });
      addVectorLayer(map, "Situations");
      var element = document.getElementById('popup');
  
      var popup = new ol.Overlay({   
          element: element,
          positioning: 'bottom-center',
          stopEvent: false
      });
      map.addOverlay(popup);
  
      $(window).resize(function () {     
          $("#map").height($(window).height());
          map.updateSize();
      })
  
      $(element).popover({
          'placement': 'top',
          'html': true,
          template: '<div class="popover woopwoop"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>',
      });
      map.on('click', function (evt) {
          var node = evt.originalEvent.target.parentNode;
          while (node != null) {          //Check if click is inside of popup, then ignore click on map
              if ($(node).hasClass("woopwoop") == true)
                  return false;
              node = node.parentNode;
          }
          var features = [];
          map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
              features.push(feature);
          });
          if (features.length == 0) {
              $(element).popover('hide');
          } else {
              var geometry = features[0].getGeometry();
              var coord = geometry.getCoordinates();
              popup.setPosition(coord);
              var header = "";
              var text = "";
              if (features.length > 1) {
                  //Multiple situations in search result, displaying first two
                  header = "Sökresultat";
                  $.each(features, function (index, feature) {
                      if (index > 1) {
                          text += "<br/><br/><i>Sökningen gav <b>" + features.length + "</b> resultat. För att se mer information, zooma in i kartan och klicka på önskad företeelse.</i>";
                          return false;
                      }
                      var managedCause = feature.get('managedCause');
                      text += "<div class='panel panel-info'><div class='panel-heading'><h3 class='panel-title'> <a data-toggle='collapse' data-target='#collapse" + index + "' href='#collapse" + index + "'>" + managedCause.MessageType + "</a></h3></div><div id='collapse" + index + "' class='panel-collapse collapse " + (index == 0 ? "in" : "") + "'><div class='panel-body'>";
                      text += "<i>" + (managedCause.LocationDescriptor || "") + "</i>";
                      $.each(feature.get('data').Deviation, function (index2, deviation) {
                          var active = isActive(deviation);
                          text += "<h4 style='background-image: url(" + apiUrl + "icons/" + deviation.IconId + (!active ? "Planned" : "") + "?type=png16x16)'>" + (deviation.MessageCode || deviation.RoadNumber || "") + ((deviation.Header || null) != null ? (" - " + deviation.Header) : "") + "</h4>";
                          text += formatDeviationText(deviation);
                      });
                      text += "</div></div></div>"
  
                  });
  
              } else {
                  //Single situation in search result
                  header = "Sökresultat";
                  var managedCause = features[0].get('managedCause');
                  text += "<div class='panel panel-info'><div class='panel-heading'><h3 class='panel-title'>" + managedCause.MessageType + "</h3></div><div class='panel-body'>"
                  text += "<i>" + (managedCause.LocationDescriptor || "") + "</i>";
                  $.each(features[0].get('data').Deviation, function (index2, deviation) {
                      var active = isActive(deviation);
                      text += "<h4 style='background-image: url(" + apiUrl + "icons/" + deviation.IconId + (!active ? "Planned" : "") + "?type=png16x16)'>" + (deviation.MessageCode || deviation.RoadNumber || "") + ((deviation.Header || null) != null ? (" - " + deviation.Header) : "") + "</h4>";
                      text += formatDeviationText(deviation);
                  });
                  text += "</div></div>"
              }
              var offset = $(element).offset();
              var top = offset.top;
              var height = $(document).outerHeight();
              var vert = 0.5 * height - top;
              var vertPlacement = vert > 0 ? 'bottom' : 'top';
  
              $(element).data('bs.popover').options.placement = vertPlacement;
              $(element).data('bs.popover').options.content = '<h3>' + header + '</h3>' + text
  
              $(element).popover('show');
          }
      });
  
      $(window).trigger("resize");
  });
  
  //Function for adding vector layers to map
  function addVectorLayer(mapObject, type) {
  
      var features = [];
      var format = new ol.format.WKT();
      switch (type) {
          case "Situation":
          default:
              var xmlRequest = "<REQUEST>" +
                          // Use your valid authenticationkey
                              "<LOGIN authenticationkey='yourAuthenticationKey' />" +
                              "<QUERY objecttype='Situation' schemaversion='1.2'>" +
                                  "<FILTER>" +
                                      "<GTE name='Deviation.EndTime' value='$now'/>" +
                                  "</FILTER>" +
                              "</QUERY>" +
                          "</REQUEST>";
              $.ajax({
                  type: "POST",
                  contentType: "text/xml",
                  dataType: "json",
                  data: xmlRequest,
                  success: function (response) {
                      if (response == null) return;
                      try {
  
                          $.each(response.RESPONSE.RESULT[0].Situation, function (index, item) {
                              var iconId = null;
                              var managedCause = null;
                              $.each(item.Deviation, function (index2, deviation) {
                                  if (deviation.MessageCode == 'Vägen avstängd')
                                      iconId = deviation.IconId;
                                  if (deviation.ManagedCause)
                                      managedCause = deviation;
                              });
                              var active = isActive(managedCause);
                              if (!active) { //If managed cause is not active, check if underlying is active and in that case, use active Icon
                                  $.each(item.Deviation, function (index2, deviation) {
                                      if (isActive(deviation)) {
                                          active = true;
                                          return false;   //Check done, break loop
                                      }
                                  });
                              }
                              if (typeof ((((managedCause || item.Deviation[0]) || []).Geometry || []).WGS84) != "undefined") {
                                  var feature = new ol.Feature({
                                      geometry: format.readGeometry((managedCause || item.Deviation[0]).Geometry.WGS84).transform("EPSG:4326", "EPSG:3857"),
                                      data: item,
                                      iconId: iconId || managedCause.IconId,
                                      active: active,
                                      managedCause: managedCause
                                  });
                                  features.push(feature);
                              }
                          });
                          var source = new ol.source.Vector({ //Creates a source for the vector layer
                              features: features
                          });
                          var getIcon = function (feature, resolution) {
                              var active = feature.get("active");
                              if(resolution > 40)
                                  return apiUrl + "icons/" + feature.get("iconId") + (!active ? "Planned" : "") + "?type=png16x16";
                              else
                                  return apiUrl + "icons/" + feature.get("iconId") + (!active ? "Planned" : "") + "?type=png32x32";
                          }
  
                          var styleFunction = function (feature, resolution) {    //Function to determine style of icons
                              return [new ol.style.Style({
                                  image: new ol.style.Icon(({
                                      anchor: [0.5, 8],
                                      anchorXUnits: 'fraction',
                                      anchorYUnits: 'pixels',
                                      opacity: 0.75,
                                      src: getIcon(feature, resolution)   
                                  }))
                              })];
                          };
  
                          var vectorLayer = new ol.layer.Vector({     //Creates a layer for deviations
                              source: source,
                              style: styleFunction
                          });
                          mapObject.addLayer(vectorLayer);
                      }
                      catch (ex) { }
                  },
                  error: function (xhr, status, error) {
                      var err = status;
                  },
                  complete: function (xhr, status) {
                      var status = status;
                  }
              });
              break;
      }
  
  }
  
  function formatDeviationText(deviation) {
      var text = "";
      switch (deviation.MessageCode) {
          case "Körfältsavstängningar":
              text += (deviation.NumberOfLanesRestricted || null) != null ? (deviation.NumberOfLanesRestricted + " körfält avstäng" + (deviation.NumberOfLanesRestricted == 1 ? "t" : "da")) : "";
              break;
          default:
              text += "<p>" + (((deviation.Message || "") + (deviation.TemporaryLimit || "")) || deviation.LocationDescriptor || "") + "</p>";
              text += "<div class='table-responsive'>";
              text += "<table class='table table-bordered table-striped'><tbody>";
              text += formatDeviationTableRow("Starttid", deviation.StartTime);
              text += formatDeviationTableRow("Sluttid", deviation.EndTime);
              text += "</tbody></table>";
              text += "</div>";
              break;
      }
      return text;
  }
  
  function formatDeviationTableRow(header, value) {
      if (typeof (value) == "undefined")
          return "";
      return "<tr><td class='text-nowrap'><strong>" + header + "</strong></td><td>" + value + "</td></tr>";
  }
  
  //Checks if a deviation is currently active
  function isActive(deviation) {
          var active = false;
          if (typeof (deviation.Schedule) != "undefined") {
              $.each(deviation.Schedule, function (scheduleIndex, schedule) {
                  var currentTime = new Date();
                  var startOfPeriod = new Date(schedule.StartOfPeriod);
                  var endOfPeriod = new Date(schedule.EndOfPeriod);
                  if (startOfPeriod <= currentTime && currentTime <= endOfPeriod)
                      active = true;
              });
          } else {
              active = true;
          }
          if (typeof (deviation.StartTime) != "undefined") {
              var startTime = new Date(deviation.StartTime);
              var endTime = new Date(deviation.EndTime)
              var currentTime = new Date();
              if (startTime > currentTime && currentTime < endTime)
                  active = false;
          }
          deviation.active = active;
          return active;
  }
  
  </script>
  </body>
  </html>
