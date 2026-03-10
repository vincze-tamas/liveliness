import { Smartphone, Wifi, Globe, RefreshCw, Upload, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SetupPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Setup</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Connect your iPhone and install Liveliness on your home screen.
        </p>
      </div>

      {/* Install to home screen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="w-5 h-5 text-teal-600" />
            Add to Home Screen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Install Liveliness as a PWA so it opens full-screen, like a native app.
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
            <li>Open this page in <strong className="text-slate-700 dark:text-slate-200">Safari</strong> on your iPhone.</li>
            <li>Tap the <strong className="text-slate-700 dark:text-slate-200">Share</strong> button (square with arrow).</li>
            <li>Scroll down and tap <strong className="text-slate-700 dark:text-slate-200">&ldquo;Add to Home Screen&rdquo;</strong>.</li>
            <li>Tap <strong className="text-slate-700 dark:text-slate-200">Add</strong> — Liveliness appears on your home screen.</li>
          </ol>
          <p className="text-xs text-slate-400">
            On Chrome / Edge (Android or desktop): look for the install icon in the address bar.
          </p>
        </CardContent>
      </Card>

      {/* iOS Shortcut - connectivity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="w-5 h-5 text-teal-600" />
            Step 1 — Connect your iPhone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            The iOS Shortcut sends health data from Apple Health to Liveliness over the network.
            Choose one option:
          </p>

          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1">
              <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-slate-400" />
                Option A — Same Wi-Fi
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Your iPhone and computer must be on the same local network.
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <li>Find your computer&apos;s local IP (e.g. <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">192.168.1.42</code>).</li>
                <li>Your endpoint: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">http://192.168.1.42:8000/api/health/sync</code></li>
              </ol>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1">
              <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-slate-400" />
                Option B — Tailscale
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Works anywhere — not just at home. Requires a computer running 24/7.
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <li>Install Tailscale on your computer and iPhone; sign in with the same account.</li>
                <li>Find your computer&apos;s Tailscale IP (e.g. <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">100.64.0.5</code>).</li>
                <li>Your endpoint: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">http://100.64.0.5:8000/api/health/sync</code></li>
              </ol>
            </div>

            <div className="rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 p-3 space-y-1">
              <p className="font-medium text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                Option C — VPS / Cloud <span className="text-xs font-normal">(recommended — no computer needed)</span>
              </p>
              <p className="text-xs text-teal-700 dark:text-teal-400">
                App runs on a cheap VPS (~€4/month). Works from anywhere, no computer required.
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-teal-700 dark:text-teal-400 mt-2">
                <li>Deploy with <code className="bg-teal-100 dark:bg-teal-900/40 px-1 rounded">docker compose -f docker-compose.prod.yml up -d</code></li>
                <li>Your endpoint: <code className="bg-teal-100 dark:bg-teal-900/40 px-1 rounded">https://yourdomain.com/api/health/sync</code></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* iOS Shortcut - creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="w-5 h-5 text-teal-600" />
            Step 2 — Create the &ldquo;Liveliness Sync&rdquo; Shortcut
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>Requires iOS 16+ and the built-in <strong>Shortcuts</strong> app.</p>

          <div className="space-y-3">
            <StepBlock n={1} title="Open Shortcuts and create a new shortcut">
              Open the <strong>Shortcuts</strong> app → tap <strong>+</strong> → rename it to <em>Liveliness Sync</em>.
            </StepBlock>

            <StepBlock n={2} title="Add HealthKit data actions">
              <p className="mb-2">Add one <strong>&ldquo;Find Health Samples&rdquo;</strong> action for each metric:</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-1 text-slate-500">Metric</th>
                    <th className="text-left py-1 text-slate-500">HealthKit type</th>
                    <th className="text-left py-1 text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    ['HRV', 'Heart Rate Variability (RMSSD)', 'Last 1 day'],
                    ['Resting HR', 'Resting Heart Rate', 'Last 1 day'],
                    ['Weight', 'Body Mass', 'Last 1 day'],
                    ['Sleep', 'Sleep Analysis', 'Last 1 day'],
                    ['Steps', 'Step Count', 'Yesterday'],
                    ['Active Energy', 'Active Energy Burned', 'Yesterday'],
                    ['Blood Oxygen', 'Oxygen Saturation', 'Last 1 day'],
                  ].map(([m, t, d]) => (
                    <tr key={m}>
                      <td className="py-1 font-medium text-slate-700 dark:text-slate-300">{m}</td>
                      <td className="py-1 text-slate-500">{t}</td>
                      <td className="py-1 text-slate-500">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2">Also add: <strong>Find Workouts</strong> → Date: Yesterday → Sort: Start Date descending.</p>
            </StepBlock>

            <StepBlock n={3} title="Build the JSON payload">
              <p className="mb-2">Add a <strong>Text</strong> action and paste this template. Replace each <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">&lt;…&gt;</code> with the matching HealthKit variable.</p>
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto leading-relaxed">{`{
  "date": "<Current Date ISO 8601>",
  "hrv_ms": <HRV Samples — first value>,
  "resting_hr": <Resting HR — first value>,
  "weight_kg": <Body Mass — first value>,
  "sleep_hours": <Sleep — sum of durations h>,
  "steps": <Steps — sum>,
  "active_energy_kcal": <Active Energy — sum>,
  "blood_oxygen_pct": <Oxygen Sat — first value>,
  "workouts": <Workouts — as JSON>
}`}</pre>
              <p className="text-xs text-slate-400 mt-1">Use <code>null</code> for any metric with no sample — the backend handles it gracefully.</p>
            </StepBlock>

            <StepBlock n={4} title="POST to the backend">
              <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400">
                <li>Add a <strong>Get Contents of URL</strong> action.</li>
                <li>Set <strong>URL</strong> to your endpoint from Step 1.</li>
                <li>Set <strong>Method</strong> to <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">POST</code>.</li>
                <li>Set <strong>Request Body</strong> to <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">File</code> and pass the Text variable from Step 3.</li>
              </ol>
            </StepBlock>

            <StepBlock n={5} title="Add to Automations (runs daily at 7 AM)">
              <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400">
                <li>Go to the <strong>Automation</strong> tab → tap <strong>+</strong> → <strong>Personal Automation</strong>.</li>
                <li>Choose <strong>Time of Day</strong> → <strong>7:00 AM</strong> → <strong>Daily</strong>.</li>
                <li>Add action: <strong>Run Shortcut</strong> → select <em>Liveliness Sync</em>.</li>
                <li>Disable <strong>&ldquo;Ask Before Running&rdquo;</strong> so it runs silently.</li>
              </ol>
            </StepBlock>
          </div>
        </CardContent>
      </Card>

      {/* Bulk historical import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-5 h-5 text-teal-600" />
            Bulk import: Apple Health XML export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>Use this to import all your historical health data at once.</p>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
            <li>On iPhone: <strong>Health app</strong> → profile picture → <strong>Export All Health Data</strong>.</li>
            <li>Share the <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">export.zip</code> to your computer (~100 MB+).</li>
            <li>In Liveliness: go to <strong>Profile → Import Health Data</strong> and upload the ZIP.</li>
            <li>The backend processes it in the background — may take a few minutes.</li>
          </ol>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            Test &amp; troubleshoot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>To verify the Shortcut works before the first automation run:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400">
            <li>Open the <em>Liveliness Sync</em> shortcut and tap <strong>▶ Play</strong>.</li>
            <li>Check backend logs: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">docker compose logs -f backend</code></li>
            <li>You should see <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">POST /api/health/sync 200</code>.</li>
            <li>Return to the Dashboard — today&apos;s metrics should appear.</li>
          </ol>

          <table className="w-full text-xs mt-2 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-1 text-slate-500">Problem</th>
                <th className="text-left py-1 text-slate-500">Solution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                ['\u201CCould not connect\u201D', 'Verify IP; ensure backend is running (docker compose ps)'],
                ['Shortcut asks for permission', 'Settings → Privacy & Security → Health → Shortcuts → Allow'],
                ['No HRV data', 'HRV requires a chest strap or Garmin morning measurement'],
                ['Workouts missing', 'Garmin Connect app → Settings → Health & Fitness → Share with Health'],
              ].map(([p, s]) => (
                <tr key={p}>
                  <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-400">{p}</td>
                  <td className="py-1.5 text-slate-500">{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function StepBlock({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="space-y-1.5">
        <p className="font-medium text-slate-800 dark:text-slate-200">{title}</p>
        <div className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
