// When you use this, please install my Google Apps Script library GeminiWithFiles.
// ref: https://github.com/tanaikech/GeminiWithFiles
function sample1b() {
  const apiKey = "###"; // Please set your API key.
  const fileId = "###"; // File ID of the sample video (mp4) on your Google Drive.

  const q = "Description this video."; // Prompt

  // Upload mp4 data to Gemini.
  const object = {
    source: { fileId },
    destination: {
      uploadUrl: `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${apiKey}`,
      metadata: { file: { displayName: DriveApp.getFileById(fileId).getName() } }
    },
    accessToken: ScriptApp.getOAuthToken(),
  };
  const { file } = new UploadApp(object).run();

  // Generate content with the uploaded mp4 data.
  const g = GeminiWithFiles.geminiWithFiles({ apiKey, functions: {} });
  const res = g.withUploadedFilesByGenerateContent([file]).generateContent({ q });
  console.log(res);
}
