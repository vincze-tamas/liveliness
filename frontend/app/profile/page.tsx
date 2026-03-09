'use client'

import { useEffect, useState } from 'react'
import { Save, RefreshCw, Upload, User, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { apiFetch } from '@/lib/api'

interface ProfileData {
  name: string
  sex: string
  birthDate: string
  weight: string
  height: string
  maxHR: string
  restingHR: string
  ftpCycling: string
  thresholdPace: string
  garminUsername: string
  garminPassword: string
}

const EMPTY_PROFILE: ProfileData = {
  name: '',
  sex: '',
  birthDate: '',
  weight: '',
  height: '',
  maxHR: '',
  restingHR: '',
  ftpCycling: '',
  thresholdPace: '',
  garminUsername: '',
  garminPassword: '',
}

/** Convert "mm:ss" pace string to seconds per km, or null if unparseable. */
function parsePaceToSeconds(pace: string): number | null {
  const parts = pace.trim().split(':')
  if (parts.length !== 2) return null
  const mins = parseInt(parts[0], 10)
  const secs = parseInt(parts[1], 10)
  if (isNaN(mins) || isNaN(secs)) return null
  return mins * 60 + secs
}

/** Convert seconds per km to "mm:ss" string. */
function secondsToPace(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE)
  const [profileExists, setProfileExists] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  // Load existing profile on mount
  useEffect(() => {
    apiFetch<{
      name?: string | null
      sex?: string | null
      birth_date?: string | null
      weight_kg?: number | null
      height_cm?: number | null
      max_hr?: number | null
      resting_hr?: number | null
      ftp_cycling_w?: number | null
      ftp_running_pace_s_per_km?: number | null
      garmin_username?: string | null
    }>('/api/profile')
      .then((data) => {
        setProfileExists(true)
        setProfile({
          name: data.name ?? '',
          sex: data.sex ?? '',
          birthDate: data.birth_date ?? '',
          weight: data.weight_kg != null ? String(data.weight_kg) : '',
          height: data.height_cm != null ? String(data.height_cm) : '',
          maxHR: data.max_hr != null ? String(data.max_hr) : '',
          restingHR: data.resting_hr != null ? String(data.resting_hr) : '',
          ftpCycling: data.ftp_cycling_w != null ? String(data.ftp_cycling_w) : '',
          thresholdPace:
            data.ftp_running_pace_s_per_km != null
              ? secondsToPace(data.ftp_running_pace_s_per_km)
              : '',
          garminUsername: data.garmin_username ?? '',
          garminPassword: '',
        })
      })
      .catch(() => {
        // 404 = no profile yet, stay with empty form
        setProfileExists(false)
      })
  }, [])

  const handleChange =
    (field: keyof ProfileData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setProfile((prev) => ({ ...prev, [field]: e.target.value }))
      setSaveError(null)
    }

  const handleSave = async () => {
    setSaveError(null)
    setIsSaving(true)
    try {
      const paceSeconds = profile.thresholdPace
        ? parsePaceToSeconds(profile.thresholdPace)
        : null
      if (profile.thresholdPace && paceSeconds === null) {
        setSaveError('Threshold pace must be in mm:ss format (e.g. 4:30)')
        return
      }

      const body = {
        name: profile.name || null,
        sex: profile.sex || null,
        birth_date: profile.birthDate || null,
        weight_kg: profile.weight ? parseFloat(profile.weight) : null,
        height_cm: profile.height ? parseFloat(profile.height) : null,
        max_hr: profile.maxHR ? parseInt(profile.maxHR, 10) : null,
        resting_hr: profile.restingHR ? parseInt(profile.restingHR, 10) : null,
        ftp_cycling_w: profile.ftpCycling ? parseFloat(profile.ftpCycling) : null,
        ftp_running_pace_s_per_km: paceSeconds,
        garmin_username: profile.garminUsername || null,
        // Only send password if the user typed something
        ...(profile.garminPassword ? { garmin_password: profile.garminPassword } : {}),
      }

      if (profileExists) {
        await apiFetch('/api/profile', {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await apiFetch('/api/profile', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        setProfileExists(true)
      }
      // Clear password field after successful save
      setProfile((prev) => ({ ...prev, garminPassword: '' }))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGarminSync = async () => {
    setSyncResult(null)
    setIsSyncing(true)
    try {
      const result = await apiFetch<{ activities_inserted: number; metrics_upserted: number }>(
        '/api/health/garmin-sync',
        { method: 'POST' },
      )
      setSyncResult(
        `Synced: ${result.activities_inserted} activities, ${result.metrics_upserted} health metrics`,
      )
    } catch (err) {
      setSyncResult(err instanceof Error ? err.message : 'Garmin sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-900/40">
          <User className="w-7 h-7 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your athlete profile &amp; settings
          </p>
        </div>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={profile.name}
              onChange={handleChange('name')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sex">Sex</Label>
              <Select
                id="sex"
                value={profile.sex}
                onChange={handleChange('sex')}
              >
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={profile.birthDate}
                onChange={handleChange('birthDate')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="70"
                min={30}
                max={200}
                step={0.1}
                value={profile.weight}
                onChange={handleChange('weight')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="175"
                min={100}
                max={250}
                value={profile.height}
                onChange={handleChange('height')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physiology */}
      <Card>
        <CardHeader>
          <CardTitle>Physiology</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maxHR">Max HR (bpm)</Label>
              <Input
                id="maxHR"
                type="number"
                placeholder="190"
                min={120}
                max={220}
                value={profile.maxHR}
                onChange={handleChange('maxHR')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="restingHR">Resting HR (bpm)</Label>
              <Input
                id="restingHR"
                type="number"
                placeholder="52"
                min={30}
                max={100}
                value={profile.restingHR}
                onChange={handleChange('restingHR')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ftpCycling">FTP Cycling (W)</Label>
              <Input
                id="ftpCycling"
                type="number"
                placeholder="250"
                min={50}
                max={600}
                value={profile.ftpCycling}
                onChange={handleChange('ftpCycling')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thresholdPace">Threshold Pace (min/km)</Label>
              <Input
                id="thresholdPace"
                type="text"
                placeholder="4:30"
                value={profile.thresholdPace}
                onChange={handleChange('thresholdPace')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Garmin Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Garmin Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="garminUsername">Garmin Username</Label>
            <Input
              id="garminUsername"
              placeholder="your.garmin@email.com"
              value={profile.garminUsername}
              onChange={handleChange('garminUsername')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="garminPassword">Garmin Password</Label>
            <Input
              id="garminPassword"
              type="password"
              placeholder={profileExists ? '(unchanged)' : 'Password'}
              value={profile.garminPassword}
              onChange={handleChange('garminPassword')}
              autoComplete="new-password"
            />
          </div>
          {syncResult && (
            <p className="text-sm text-slate-600 dark:text-slate-300">{syncResult}</p>
          )}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGarminSync}
            disabled={isSyncing || !profile.garminUsername}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync Garmin Activities'}
          </Button>
        </CardContent>
      </Card>

      {/* Apple Health Import */}
      <Card>
        <CardHeader>
          <CardTitle>Apple Health Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Export your Apple Health data from the Health app and upload it
            here. Go to Health → your profile → Export All Health Data.
          </p>
          <label
            htmlFor="healthImport"
            className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-pointer hover:border-teal-400 dark:hover:border-teal-600 transition-colors group"
          >
            <Upload className="w-8 h-8 text-slate-300 dark:text-slate-600 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Tap to upload Apple Health export (.zip)
            </span>
            <input
              id="healthImport"
              type="file"
              accept=".zip"
              className="sr-only"
            />
          </label>
        </CardContent>
      </Card>

      {/* Save Button */}
      {saveError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {saveError}
        </div>
      )}
      <Button
        className="w-full gap-2"
        onClick={handleSave}
        disabled={isSaving}
      >
        <Save className="w-4 h-4" />
        {isSaving ? 'Saving…' : 'Save Profile'}
      </Button>

      <div className="h-2" />
    </div>
  )
}
