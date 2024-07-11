function sample1a() {
  const apiKey = "###"; // Please set your API key.
  const fileId = "###"; // Please set the file ID of the uploaded file on Google Drive.


  const object = {
    source: { fileId },
    destination: {
      uploadUrl: `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${apiKey}`,
      metadata: { file: { displayName: DriveApp.getFileById(fileId).getName() } }
    },
    accessToken: ScriptApp.getOAuthToken(),
  };
  const res = new UploadApp(object).run();
  console.log(res);

  // DriveApp.createFile(); // This comment line is used for automatically detecting a scope of Drive API. So, please don't remove this.
}
