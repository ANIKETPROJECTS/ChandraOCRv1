import { useState, useCallback, useRef } from "react";
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Download, Copy, Trash2, Plus, Clock, FileJson, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useExtractor, useRecentExtractions } from "@/hooks/use-extractor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    file, setFile,
    mode, setMode,
    outputFormat, setOutputFormat,
    useSchema, setUseSchema,
    schemaFields, setSchemaFields,
    status, result, error, elapsedTime,
    extract, loadResult, setStatus
  } = useExtractor();

  const recentExtractions = useRecentExtractions();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "idle" && status !== "error" && status !== "complete") return;
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStatus("idle");
    }
  }, [setFile, setStatus, status]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
    }
  }, [setFile, setStatus]);

  const removeFile = () => {
    setFile(null);
    setStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addSchemaField = () => {
    setSchemaFields([...schemaFields, { id: Math.random().toString(), key: "", type: "string", description: "" }]);
  };

  const updateSchemaField = (id: string, field: string, value: string) => {
    setSchemaFields(schemaFields.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeSchemaField = (id: string) => {
    setSchemaFields(schemaFields.filter(f => f.id !== id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-primary/20">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="space-y-2">
          <h1 className="text-4xl font-serif font-semibold tracking-tight text-primary">Document Extractor</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">A focused workspace for turning messy documents into clean, structured data. Upload a file to begin extraction.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Upload Document</CardTitle>
                <CardDescription>Accepts PDF, DOCX, PPTX, PNG, JPG, WEBP</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => status !== "processing" && status !== "uploading" && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
                    ${(status === "processing" || status === "uploading") ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary/50 hover:border-primary/50"}
                    ${file ? "border-primary/50 bg-secondary/20" : "border-border"}
                  `}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp" 
                  />
                  
                  {file ? (
                    <div className="flex flex-col items-center space-y-4">
                      <FileText className="h-12 w-12 text-primary" />
                      <div>
                        <p className="font-medium text-lg">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      {(status === "idle" || status === "error") && (
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                          Remove File
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-4">
                      <UploadCloud className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-lg">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">Any supported document format up to 50MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {status === "error" && (
                  <div className="mt-4 p-4 rounded-md bg-destructive/10 text-destructive flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Extraction Failed</h4>
                      <p className="text-sm opacity-90">{error}</p>
                    </div>
                  </div>
                )}

                {(status === "uploading" || status === "processing") && (
                  <div className="mt-6 space-y-4 p-6 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span className="font-medium">
                          {status === "uploading" ? "Uploading document..." : "Processing document..."}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-sm font-mono">{elapsedTime}s</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500 ease-in-out w-full animate-pulse" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {status === "complete" && result && (
              <Card className="border-border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Extraction Complete
                    </CardTitle>
                    <CardDescription>Processed in {result.runtime?.toFixed(1) || elapsedTime} seconds</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.markdown || result.html || JSON.stringify(result.json, null, 2) || "")}>
                      <Copy className="w-4 h-4 mr-2" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadFile(result.markdown || "", "extracted.md", "text/markdown")}>
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="preview" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="raw">Raw Text</TabsTrigger>
                      <TabsTrigger value="structured" disabled={!result.extraction_schema_json}>Structured Data</TabsTrigger>
                      <TabsTrigger value="meta">Metadata</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="preview" className="p-4 rounded-md border border-border bg-card mt-2 min-h-[400px] max-h-[600px] overflow-y-auto prose dark:prose-invert max-w-none">
                      {result.markdown ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.markdown}</ReactMarkdown>
                      ) : result.html ? (
                        <div dangerouslySetInnerHTML={{ __html: result.html }} />
                      ) : (
                        <pre className="font-mono text-sm">{JSON.stringify(result.json, null, 2)}</pre>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="raw" className="mt-2">
                      <textarea 
                        className="w-full h-[400px] p-4 rounded-md border border-border bg-muted/50 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        readOnly
                        value={result.markdown || result.html || JSON.stringify(result.json, null, 2)}
                      />
                    </TabsContent>

                    <TabsContent value="structured" className="mt-2">
                      <div className="p-4 rounded-md border border-border bg-muted/50 max-h-[400px] overflow-y-auto">
                        <pre className="font-mono text-sm">{JSON.stringify(result.extraction_schema_json, null, 2)}</pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="meta" className="mt-2">
                      <div className="space-y-4 p-4 rounded-md border border-border bg-card">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground block mb-1">Status</span>
                            <span className="font-medium capitalize">{result.status}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-1">Page Count</span>
                            <span className="font-medium">{result.page_count || "Unknown"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-1">Processing Time</span>
                            <span className="font-medium">{result.runtime ? `${result.runtime.toFixed(2)}s` : "Unknown"}</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Extraction Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-3">
                  <Label>Processing Mode</Label>
                  <Select value={mode} onValueChange={(v: any) => setMode(v)} disabled={status === "processing" || status === "uploading"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast (Lower accuracy)</SelectItem>
                      <SelectItem value="balanced">Balanced (Recommended)</SelectItem>
                      <SelectItem value="accurate">Accurate (Slower, best results)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Output Format</Label>
                  <Select value={outputFormat} onValueChange={(v: any) => setOutputFormat(v)} disabled={status === "processing" || status === "uploading"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Structured Fields</Label>
                      <p className="text-xs text-muted-foreground">Extract specific data points</p>
                    </div>
                    <Switch checked={useSchema} onCheckedChange={setUseSchema} disabled={status === "processing" || status === "uploading"} />
                  </div>

                  {useSchema && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      {schemaFields.map((field, index) => (
                        <div key={field.id} className="p-3 bg-secondary/30 rounded-md border border-border relative group">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeSchemaField(field.id)}
                            disabled={status === "processing" || status === "uploading"}
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </Button>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <Input 
                              placeholder="Key (e.g. invoice_total)" 
                              value={field.key} 
                              onChange={(e) => updateSchemaField(field.id, "key", e.target.value)}
                              className="h-8 text-sm"
                              disabled={status === "processing" || status === "uploading"}
                            />
                            <Select value={field.type} onValueChange={(v) => updateSchemaField(field.id, "type", v)} disabled={status === "processing" || status === "uploading"}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Input 
                            placeholder="Description to help AI extract this field" 
                            value={field.description} 
                            onChange={(e) => updateSchemaField(field.id, "description", e.target.value)}
                            className="h-8 text-sm"
                            disabled={status === "processing" || status === "uploading"}
                          />
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs border-dashed" 
                        onClick={addSchemaField}
                        disabled={status === "processing" || status === "uploading"}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Field
                      </Button>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full mt-4" 
                  size="lg" 
                  onClick={extract}
                  disabled={!file || status === "processing" || status === "uploading"}
                >
                  {status === "processing" || status === "uploading" ? "Processing..." : "Extract Document"}
                </Button>
              </CardContent>
            </Card>

            {recentExtractions.length > 0 && (
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Extractions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentExtractions.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => status !== "processing" && status !== "uploading" && loadResult(item.id)}
                        className={`p-3 rounded-md border flex items-center justify-between cursor-pointer transition-colors
                          ${status === "processing" || status === "uploading" ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary/50"}
                          ${result?.status === "complete" && item.status === "complete" ? "border-border" : "border-border"}
                        `}
                      >
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{item.filename}</p>
                          <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}</p>
                        </div>
                        {item.status === "complete" ? (
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0 ml-2" />
                        ) : item.status === "error" ? (
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0 ml-2" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0 ml-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}