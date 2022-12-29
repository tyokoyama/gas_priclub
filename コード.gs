// LINEからのリクエストに対して画像のURLを返そうとした残骸
function getImage() {
  // imageフォルダ
  let folder = DriveApp.getFolderById("撮影画像保存フォルダのID");
  let files = folder.getFiles();
  let file = null;
  while(files.hasNext()) {
    file = files.next();
    Logger.log(file.getName() + " : " + file.getId());
  }

  Logger.log(file.getDownloadUrl());
  return file.getDownloadUrl();
}

function doGet(e) {
  console.log(e);
  if(e.pathInfo != null && e.pathInfo != undefined) {
    if(e.pathInfo.startsWith("image")) {
      console.log("画像のダウンロード");
      return getImage();
    }
  } else {
    return HtmlService.createTemplateFromFile("index").evaluate().setTitle("（外部用）文化祭プリクラシステム");
  }
}

// LINE Messaging API用アクセストークン
var accessToken = "[IDはLINE Developer Consoleで取得してください]";

function doPost(e) {
  let doc = DocumentApp.create('Postlog');
  let ss = SpreadsheetApp.openById('[LINEのユーザIDを保存するSpreadSheetのID');
  let sheet = ss.getSheetByName('master');
  let body = doc.getBody();

  // Logger.log("doPost");
  log(body, "doPost");
  if(e.contextPath.length == 0) {
    // LINEからのリクエスト
    // console.log(e.postData);
    logJSON(body, e.postData);

    let contents = JSON.parse(e.postData.contents);
    console.log(contents);
    if(contents.events.length > 0) {
      for(let i = 0; i < contents.events.length; i++) {
        // console.log(contents.events[i]);
        logJSON(body, contents.events[i]);
        // 友だち追加
        if(contents.events[i].type == "follow") {
          log(body, "User: " + contents.events[i].source.userId);
          sheet.getRange(1, 1).setValue(contents.events[i].source.userId);
          // let response = UrlFetchApp.fetch("https://api.line.me/v2/bot/profile/" + contents.events[i].source.userId
          //                                 , {
          //                                   'method' : 'get',
          //                                   'headers' : {
          //                                     'Authorization' : "Bearer " + "{" + accessToken + "}"
          //                                   }
          //                                 });
          // log(body, response.getContentText());
          // log(body, parseInt(response.getResponseCode()));
          // if(response.getResponseCode() == 200) {
          //   // 正常時は表示名とIdを控えておく
          //   let user = JSON.parse(response.getContentText());
          //   log(body, "User: " + user.userId + " displayName: " + user.displayName);

          //   let values = [[user.userId, user.displayName]];
          //   let row = sheet.getLastRow() + 1;
          //   sheet.getRange(row, 1, 1, 2).setValues(values);
          // }
        }
      }
    } else {
      // Webhookの検証ボタンか不正リクエスト
      // console.log("Webhookの検証");
      log(body, "Webhookの検証");
    }
  } else {
    // その他のリクエスト
  }
}

function log(body, str) {
  body.appendParagraph(Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd HH:mm:ss.SSS") + " : " + str);
}

function logJSON(body, obj) {
  body.appendParagraph(Utilities.formatDate(new Date(), "JST", "yyyy-MM-dd HH:mm:ss.SSS") + " : " + JSON.stringify(obj));
}

function sendMessage(fileUrl) {
  Logger.log(fileUrl);

  let ss = SpreadsheetApp.openById('[LINEのユーザIDを保存するSpreadSheetのID]');
  let sheet = ss.getSheetByName('master');

  // プレビュー画像：1MB、オリジナル画像：10MB
  let data = {to: sheet.getRange(1,1).getValue(),
              messages: [
                {type: "text", text: "作成したプリクラ画像が完成したのでお渡しします！"},
                {type: "image", originalContentUrl: fileUrl, previewImageUrl: fileUrl}
              ]};

  let response = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push"
                    , {
                        'method' : 'post',
                        'contentType' : 'application/json',
                        'headers' : {
                          'Authorization' : "Bearer " + "{" + accessToken + "}"
                        },
                        'payload' : JSON.stringify(data)
                      });

  Logger.log(response);
}

function saveDrive(sendData) {
  Logger.log(sendData);

  let now = new Date();
  let nowString = Utilities.formatDate(now, "JST", "yyyyMMddHHmmss");

  let data = sendData.replace("data:image/jpeg;base64,", "");
  data = data.replace(" ", "+");
  let image = Utilities.base64Decode(data);
  image = Utilities.newBlob(image);
  image.setName(nowString + ".jpg");

  let folder = DriveApp.getFolderById("[撮影画像保存用フォルダのID]");
  let file = DriveApp.createFile(image);
  file.moveTo(folder);

  // LINEの公式アカウントを通じて写真を送る
  sendMessage(file.getDownloadUrl());
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}