/**
 * ### Description
 * Upload a little large data with Google APIs. The target of this script is the data with several hundred MB.
 * GitHub: https://github.com/tanaikech/UploadApp
 * 
 * Sample situation:
 * - Upload a file from Google Drive to Gemini, Google Drive, YouTube, and so on.
 * - Upload a file from the URL outside of Google to Gemini, Google Drive, YouTube, and so on.
 */
class UploadApp {

  /**
   *
   * @param {Object} object Information of the source data and the metadata of the destination.
   * @param {Object} object.source Information of the source data.
   * @param {Object} object.destination Information of the metadata of the destination.
   */
  constructor(object = {}) {
    this.property = PropertiesService.getScriptProperties();
    const next = this.property.getProperty("next");
    if (!next && (!object.source || (!object.source.fileId && !object.source.url))) {
      throw new Error("Please set a valid object.");
    } else if (next) {
      this.tempObject = JSON.parse(next);
      this.current = this.tempObject.next;
      this.tempObject.next = 0;
      if (this.tempObject.result) {
        delete this.tempObject.result;
      }
    } else {
      this.current = 0;
      this.tempObject = { orgObject: { ...object } };
    }
    if (this.tempObject.orgObject.source.fileId) {
      this.googleDrive = true;
      this.fileGet = `https://www.googleapis.com/drive/v3/files/${this.tempObject.orgObject.source.fileId}?supportsAllDrives=true`;
      this.downloadUrl = `${this.fileGet}&alt=media`;
    } else {
      this.googleDrive = false;
      this.downloadUrl = this.tempObject.orgObject.source.url;
    }
    this.startTime = Date.now();
    this.limitProcessTime = 300 * 1000; // seconds
    this.authorization = `Bearer ${this.tempObject.orgObject.accessToken || ScriptApp.getOAuthToken()}`;
    this.chunkSize = 16777216; // Chunk size is 16 MB.
  }

  /**
   * ### Description
   * Main method.
   *
   * @returns {Object} Response value. When the file could be completly uploaded, the file metadata of the uploaded file is returned. When the file is not be completly uploaded, an object including message.
   */
  run() {
    if (this.current == 0) {
      console.log("Get metadata");
      this.getMetadata_();
      console.log("Calculate chunks");
      this.getChunks_();
      console.log("Get location");
      this.getLocation_();
    }
    console.log("Download and upload data.");
    this.downloadAndUpload_();
    return this.tempObject.result;
  }

  /**
   * ### Description
   * Get metadata of the source data.
   *
   * @return {void}
   * @private
   */
  getMetadata_() {
    if (this.googleDrive) {
      const res = UrlFetchApp.fetch(`${this.fileGet}&fields=mimeType%2Csize`, { headers: { authorization: this.authorization } });
      const obj = JSON.parse(res.getContentText());
      if (obj.mimeType.includes("application/vnd.google-apps")) {
        throw new Error("This script cannot be used to the files related to Google. For example, Google Doc, Google Sheet, and so on.");
      }
      this.tempObject.orgObject.source.mimeType = obj.mimeType;
      this.tempObject.orgObject.source.size = obj.size;
      return;
    }
    const res = UrlFetchApp.fetch(this.downloadUrl, {
      muteHttpExceptions: true,
      headers: { Range: "bytes=0-1" }
    });
    if (res.getResponseCode() != 206) {
      throw new Error("This file cannot be done the resumable download.");
    }
    const headers = res.getHeaders();
    const range = headers["Content-Range"].split("\/");
    this.tempObject.orgObject.source.fileName = (headers["Content-Disposition"] && headers["Content-Disposition"].match(/filename=\"([a-zA-Z0-9\s\S].+)\";/)) ? headers["Content-Disposition"].match(/filename=\"([a-zA-Z0-9\s\S].+)\";/)[1].trim() : this.startTime.toString();
    this.tempObject.orgObject.source.mimeType = headers["Content-Type"].split(";")[0];
    this.tempObject.orgObject.source.size = Number(range[1]);
  }

  /**
   * ### Description
   * Calculate the chunks for uploading.
   *
   * @return {void}
   * @private
   */
  getChunks_() {
    const chunks = [...Array(Math.ceil(this.tempObject.orgObject.source.size / this.chunkSize))].map((_, i, a) => [
      i * this.chunkSize,
      i == a.length - 1 ? this.tempObject.orgObject.source.size - 1 : (i + 1) * this.chunkSize - 1,
    ]);
    this.tempObject.chunks = chunks;
  }

  /**
   * ### Description
   * Get location URL for uploading.
   *
   * @return {void}
   * @private
   */
  getLocation_() {
    const options = {
      payload: JSON.stringify(this.tempObject.orgObject.destination.metadata),
      contentType: "application/json",
      muteHttpExceptions: true,
    };
    const q = this.parseQueryParameters_(this.tempObject.orgObject.destination.uploadUrl);
    if (!q.queryParameters.uploadType) {
      throw new Error("Please confirm whether your endpoint can be used for the resumable upload. And, please include uploadType=resumable in uploadUrl.");
    }
    if (!q.queryParameters.key) {
      options.headers = { authorization: this.authorization };
    }
    const res = UrlFetchApp.fetch(this.tempObject.orgObject.destination.uploadUrl, options);
    if (res.getResponseCode() != 200) {
      throw new Error(res.getContentText());
    }
    this.tempObject.location = res.getAllHeaders()["Location"];
  }

  /**
   * ### Description
   * Download and upload data.
   *
   * @return {void}
   * @private
   */
  downloadAndUpload_() {
    let res1 = [];
    const len = this.tempObject.chunks.length;
    for (let i = this.current; i < len; i++) {
      const e = this.tempObject.chunks[i];
      const currentBytes = `${e[0]}-${e[1]}`;
      console.log(`Now... ${i + 1}/${len}`);
      const params1 = { headers: { range: `bytes=${currentBytes}` }, muteHttpExceptions: true };
      if (this.googleDrive) {
        params1.headers.authorization = this.authorization;
      }
      console.log(`Start downloading data with ${currentBytes}`);
      res1 = UrlFetchApp.fetch(this.downloadUrl, params1).getContent();
      console.log(`Finished downloading data with ${currentBytes}`);
      const params2 = {
        headers: { "Content-Range": `bytes ${currentBytes}/${this.tempObject.orgObject.source.size}` },
        payload: res1,
        muteHttpExceptions: true,
      };
      console.log(`Start uploading data with ${currentBytes}`);
      const res2 = UrlFetchApp.fetch(this.tempObject.location, params2);
      console.log(`Finished uploading data with ${currentBytes}`);
      const statusCode = res2.getResponseCode();
      if (statusCode == 200) {
        console.log("Done.");
        this.tempObject.result = JSON.parse(res2.getContentText());
      } else if (statusCode == 308) {
        console.log("Upload the next chunk.");
        res1.splice(0, res1.length);
      } else {
        throw new Error(res2.getContentText());
      }
      if ((Date.now() - this.startTime) > this.limitProcessTime) {
        this.tempObject.next = i + 1;
        this.property.setProperty("next", JSON.stringify(this.tempObject));
        break;
      }
    }
    if (this.tempObject.next > 0 && !this.tempObject.result) {
      const message = "There is the next upload chunk. So, please run the script again.";
      console.warn(message);
      this.tempObject.result = { message };
    } else {
      this.property.deleteProperty("next");
    }
  }

  /**
   * ### Description
   * Parse query parameters.
   * ref: https://github.com/tanaikech/UtlApp?tab=readme-ov-file#parsequeryparameters
   * 
   * @param {String} url URL including the query parameters.
   * @return {Array} Array including the parsed query parameters.
   * @private
   */
  parseQueryParameters_(url) {
    if (url === null || typeof url != "string") {
      throw new Error("Please give URL (String) including the query parameters.");
    }
    const s = url.split("?");
    if (s.length == 1) {
      return { url: s[0], queryParameters: null };
    }
    const [baseUrl, query] = s;
    if (query) {
      const queryParameters = query.split("&").reduce(function (o, e) {
        const temp = e.split("=");
        const key = temp[0].trim();
        let value = temp[1].trim();
        value = isNaN(value) ? value : Number(value);
        if (o[key]) {
          o[key].push(value);
        } else {
          o[key] = [value];
        }
        return o;
      }, {});
      return { url: baseUrl, queryParameters };
    }
    return null;
  }
}
