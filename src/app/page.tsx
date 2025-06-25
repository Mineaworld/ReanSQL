export default function Home() {
  return (
    <div className="flex-1 flex">
      {/* Left Panel - Questions List */}
      <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
        <div className="p-4">
          <div className="flex flex-col gap-4">
            {/* Upload Section */}
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <div className="flex flex-col items-center">
                <img src="/file.svg" alt="Upload" className="h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer rounded-md bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Upload PDF
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" />
                  </label>
                </div>
                <p className="mt-2 text-sm text-gray-500">PDF files only</p>
              </div>
            </div>
            
            {/* Questions List - Initially Empty */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500 text-center">
                Upload a PDF to see questions here
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Code Editor */}
      <div className="flex-1 flex flex-col">
        {/* Question Display */}
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="text-center text-gray-500">
            <img src="/globe.svg" alt="Welcome" className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome to ReanSQL</h2>
            <p>Upload a PDF with SQL exercises to get started</p>
          </div>
        </div>

        {/* Code Editor Area */}
        <div className="flex-1 bg-gray-50 p-4">
          <div className="h-full rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <img src="/window.svg" alt="Editor" className="h-5 w-5" />
                <span className="font-mono text-sm">SQL Editor</span>
              </div>
              <button
                disabled
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm opacity-50 cursor-not-allowed"
              >
                Submit
              </button>
            </div>
            <div className="h-[calc(100%-3rem)] font-mono bg-gray-50 rounded-md p-4">
              {/* Code editor will be integrated here */}
              <p className="text-gray-400">-- Write your SQL query here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
