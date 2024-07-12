function sample1c() {
  // This URL is from https://github.com/google/generative-ai-docs/blob/main/site/en/gemini-api/docs/prompting_with_media.ipynb
  const url = "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4"; // 64,657,027 bytes

  const apiKey = "###"; // Please set your API key.


  const q = "Description this video.";

  const object = {
    source: { url },
    destination: {
      uploadUrl: `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${apiKey}`,
      metadata: { file: { displayName: "sampleMp4File" } }
    },
    accessToken: ScriptApp.getOAuthToken(),
  };
  const { file } = new UploadApp(object).run();

  const g = GeminiWithFiles.geminiWithFiles({ apiKey, functions: {} });
  const res = g.withUploadedFilesByGenerateContent([file]).generateContent({ q });
  console.log(res);
}