'use client'

import { useState } from 'react'
import { Save, RefreshCw, Upload, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

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
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
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
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleChange = (field: keyof ProfileData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setProfile((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Phase 1: no-op
    await new Promise((r) => setTimeout(r, 800))
    setIsSaving(false)
  }

  const handleGarminSync = async () => {
    setIsSyncing(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsSyncing(false)
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
