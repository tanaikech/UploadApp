function sample2() {
  const fileId = "###"; // Please set the file ID of the uploaded file on Google Drive.


  const object = {
    source: { fileId },
    destination: {
      uploadUrl: "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      metadata: { name: DriveApp.getFileById(fileId).getName() }
    },
    accessToken: ScriptApp.getOAuthToken(),
  };
  const res = new UploadApp(object).run();
  console.log(res);

  // DriveApp.createFile(); // This comment line is used for automatically detecting a scope of Drive API. So, please don't remove this.
}
