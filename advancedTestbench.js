  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>EventSource demo - Trafikverket Labs</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.6.2/css/bulma.min.css">
      <script defer src="https://use.fontawesome.com/releases/v5.0.6/js/all.js"></script>
      <script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.22.1/moment.min.js"></script>
      <!-- Use polyfill for IE -->
      <script src="https://cdn.polyfill.io/v2/polyfill.js?features=EventSource"></script>
      <style>
          .message {
              margin-bottom: 12px !important;
          }
  
          .message-body {
              padding: 2px !important;
          }
  
          .table {
              margin-top: 5px !important;
              margin-bottom: 0px !important;
          }
  
          .col_longtimestring {
              width: 200px;
          }
      </style>
      <script>
          var xmlRequest = null;
          // Init application
          $(function () {
              // Ajax setup
              try {
                  jQuery.support.cors = true;
                  $.ajaxSetup({
                      type: "POST",
                      beforeSend: function () {
                          DisplayInfoMessage("Sending request to server");
                          $("#btnSend").hide();
                          $("#loader").show();
                      },
                      complete: function () {
                          $("#btnSend").show();
                          $("#loader").hide();
                      },
                      error: function (msg) {
                          DisplayAjaxError(msg);
                      }
                  });
              } catch (e) {
                  DisplayErrorMessage("An error occured while initializing the console.");
              }
          });
  
          // Display methods
          function DisplayAjaxError(msg) {
              if (msg.statusText === "abort") return;
              if (msg.statusText === "error" && msg.hasOwnProperty("responseJSON") && msg.responseJSON == undefined) {
                  DisplayErrorMessage("Request failed.");
                  return;
              }
              if (msg.hasOwnProperty("responseJSON") && msg.responseJSON.hasOwnProperty("RESPONSE")) {
                  var data = msg.responseJSON.RESPONSE.RESULT[0].ERROR.MESSAGE;
                  DisplayErrorMessage("Request failed:" + msg.status + " " + msg.statusText + ". " + data);
              } else if (msg.hasOwnProperty("responseJSON") && msg.responseJSON.hasOwnProperty("Message")) {
                  DisplayErrorMessage("Request failed:" + msg.status + " " + msg.statusText + ". " + msg.responseJSON.Message + ". " + msg.responseJSON.MessageDetail);
              } else {
                  DisplayErrorMessage("Request failed:" + msg.status + " " + msg.statusText);
              }
          }
  
          function DisplayErrorMessage(msg) {
              DisplayMessage(msg, "danger", "");
          }
  
          function DisplayWarningMessage(msg) {
              DisplayMessage(msg, "warning", "");
          }
  
          function DisplayInfoMessage(msg) {
              DisplayMessage(msg, "info", "");
          }
  
          function DisplaySuccessMessage(msg, content) {
              DisplayMessage(msg, "primary", content);
          }
  
          function DisplayMessage(msg, type, content) {
              const elem = $("#displayMessages");
              const date = moment().format('YYYY-MM-DD HH:mm:ss');
              var html = "<article class='message is-small is-" + type + "'>" +
                  "<div class='message-body'>" +
                  "<span class='tag is-light'>" + date + "</span>&nbsp;<b>" + msg + "</b><br/>";
              if (content !== "") html += "<span class='container' style='padding-left: 10px; padding-right: 10px;'>" + content + "</span>";
              html += "</div ></article>";
              elem.prepend(html);
          }
  
          function ClearLog() {
              $("#displayMessages").empty().show();
          }
  
          // Request methods
          function CancelRequest() {
              xmlRequest.abort();
  
          }
  
          function sendRequest() {
              var serverurl = $("#serverUrl").val();
              if (serverurl === "") {
                  $("#serverUrl").addClass("is-danger");
                  return;
              }
              var xmlDocument = $("#requestEditor").val();
              xmlRequest = $.ajax({
                  url: serverurl,
                  contentType: "text/plain",
                  dataType: "json",
                  data: xmlDocument,
                  success: function (response) {
                      if (response === null) return;
                      renderResponseData(response.RESPONSE.RESULT[0].TrainAnnouncement); // Render data to view
                      try {
                          if (response.RESPONSE.RESULT[0].INFO.SSEURL) {
                              SseUrl = response.RESPONSE.RESULT[0].INFO.SSEURL;
                              var responseid = Date.now();
                              var connectButton = " &nbsp; <span class='button is-small is-info is-outlined'>Click to connect to server</span>";
                              DisplayMessage("ServerSentEventURL received &nbsp; <span onclick='ConnectToSseServer("" + SseUrl + "&lasteventid=", "" + responseid + "")' class='button is-small is-info is-outlined'>Click to connect to server</span><input id="" + responseid +"" style='width: 200px;'  class='input is-small is-rounded' type='text' placeholder='LastEventID (optional)'>", "info",
                                  SseUrl);
                          }
                      }
                      catch (e) {
                          SseUrl = "";
                      }
                  }
              });
          }
  
          // Render methods
          function renderResponseData(data) {
              var content = renderData(data);
              DisplaySuccessMessage("Response received", content);
          }
          function renderEventSourceData(eventid, data) {
              var content = renderData(data);
              DisplaySuccessMessage("EventSource message received. <span class='tag is-primary'>id: "" + eventid + ""</span>", content);
          }
          function renderData(data) {
              var content = "<table class='table is-bordered is-striped is-narrow is-fullwidth'><thead><tr><th class='col_longtimestring'>Train</th><th>Station</th><th>Time at location</th></tr></thead><tbody>";
              $.each(data, function (index, value) {
                  content += "<tr><td>" + value.AdvertisedTrainIdent + "</td><td>" + value.LocationSignature + "</td><td>" + value.TimeAtLocation + "</td></tr>";
              });
              content += "</tbody></table >";
              return content;
          }
  
          // EventSource methods
          var SseUrl = "";
          var evtSource;
          function ConnectToSseServer(url, requestid) {
              if (evtSource && evtSource.readyState !== 2) {
                  if (evtSource.readyState === 0) DisplayInfoMessage('Already trying to reconnect.');
                  if (evtSource.readyState === 1) DisplayInfoMessage('Connection already established.');
                  return;
              }
              $('html, body').animate({
                  scrollTop: $('#eventSourceStatus').offset().top - 20
              }, 'slow');
  
              if (typeof (EventSource) == "undefined") {
                  DisplayErrorMessage("EventSource not supported, please consider using a polyfill.");
                  return;
              }
  
              evtSource = new EventSource(url + $("#"+requestid).val());
  
              DisplayInfoMessage("Connecting to server");
              evtSource.onopen = function () {
                  setEventSourceStatus("connected");
              };
              evtSource.onmessage = function (e) {
                  var data = JSON.parse(e.data);
                  if (data.RESPONSE.RESULT[0].ERROR) {
                      evtSource.close();
                      DisplayErrorMessage(data.RESPONSE.RESULT[0].ERROR.MESSAGE);
                      setEventSourceStatus("notconnected");
                      return;
                  }
  
                  var arr = data.RESPONSE.RESULT[0].TrainAnnouncement;
                  renderEventSourceData(e.lastEventId, arr);
                  return;
              }
  
              evtSource.onerror = function (e) {
                  if(this.readyState==0) setEventSourceStatus("reconnecting");
                  else setEventSourceStatus("failed");
              };
          }
  
          function DisconnectFromSseServer() {
              try {
                  evtSource.close();
                  setEventSourceStatus("closed");
              }
              catch (e) {
                  // continue regardless of error
              }
          }
  
          function setEventSourceStatus(status) {
              $(".esstatus").hide();
              switch (status) {
                  case "failed":
                      $("#notconnected").show();
                      DisplayErrorMessage('EventSource failed');
                      setEventSourceStatus("closed");
                      break;
                  case "notconnected":
                      $("#notconnected").show();
                      DisplayInfoMessage('Not connected');
                      break;
                  case "connected":
                      $("#connected").show();
                      DisplayInfoMessage("Connection to server opened");
                      break;
                  case "reconnecting":
                      $("#reconnecting").show();
                      DisplayErrorMessage("EventSource failed. Reconnecting  ...");
                      break;
                  case "closed":
                      $("#closed").show();
                      DisplayInfoMessage('Connection closed');
                      break;
              }
          }
  
      </script>
  </head>
  <body>
      <section class="section">
          <div class="container">
              <h1 class="title">
                  EventSource demo
              </h1>
              <p class="subtitle">
                  Trafikverket Labs
              </p>
              <hr style="margin-bottom: 10px;">
              <div class="field">
                  <label class="label">Server URL</label>
                  <div class="control">
                      <input id="serverUrl" class="input is-primary" type="text" value="https://api.trafikinfo.trafikverket.se/v2/data.json"/>
                  </div>
              </div>
              <div class="field">
                  <label class="label">Query</label>
                  <div class="control">
                      <textarea id="requestEditor" class="textarea is-primary is-small" >
  <REQUEST>
      <LOGIN authenticationkey='yourauthenticationkey' />
      <QUERY objecttype='TrainAnnouncement' schemaversion='1.3' limit='5' orderby='TimeAtLocation' sseurl="false">
          <FILTER>
              <GT name="TimeAtLocation" value="2999-01-01T12:00:00.000+02:00" />
          </FILTER>
          <INCLUDE>AdvertisedTrainIdent</INCLUDE>
          <INCLUDE>LocationSignature</INCLUDE>
          <INCLUDE>TimeAtLocation</INCLUDE>
      </QUERY>
  </REQUEST></textarea>
                  </div>
              </div>
              <div class="field">
                  <div class="content">
                      <ol>
                          <li>Set the datetime in the filter to a value that makes sense.</li>
                          <li>Test to set the sseurl-attribute to 'true'.</li>
                      </ol>
                  </div>
                  <div class="buttons is-right">
                      
                      <span id="btnSend" class="button is-primary is-outlined" onclick="sendRequest()">SEND</span> <span id="loader" style="display: none" class="button is-primary is-loading">SEND</span> <span onclick="CancelRequest()" class="button is-primary is-outlined">Cancel</span>
                  </div>
              </div>
              <hr style="margin-bottom: 10px;">
              <div id="eventSourceStatus" class="content">
                  <label class="label">EventSource status</label>
                  <span id="notconnected" class="esstatus tag is-info">Not connected</span>
                  <span id="connected" class="esstatus" style="display:none"><span class="tag is-primary">Connected to server</span>&nbsp;<span onclick="DisconnectFromSseServer()" class="button is-small is-primary is-outlined">Close connection</span></span>
                  <span id="reconnecting" class="esstatus" style="display:none"><span class="tag is-warning">Connection failed, reconnecting ...</span>&nbsp;<span onclick="DisconnectFromSseServer()" class="button is-small is-warning is-outlined">Cancel</span></span>
                  <span id="closed" class="esstatus tag is-danger" style="display:none">Connection closed</span>
              </div>
              <hr style="margin-bottom: 10px;">
              <div class="content">
                  <div class="columns">
                      <div class="column">
                          <label class="label">Log</label>
                      </div>
                      <div class="column">
                          <div class="buttons is-right">
                              <span onclick="ClearLog()" class="button is-primary is-outlined is-small">Clear log</span>
                          </div>
                      </div>
                  </div>
              </div>
              <div id="displayMessages" class="content"></div>
          </div>
      </section>
  </body>
  </html>
