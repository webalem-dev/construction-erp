import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  Building2,
  Upload,
  Save,
  Loader2,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  DollarSign,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'AED', label: 'UAE Dirham (AED)' },
  { value: 'SAR', label: 'Saudi Riyal (SAR)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
  { value: 'ETB', label: 'Ethiopian Birr (ETB)' },
]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
  'Europe/Paris', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata',
  'Africa/Addis_Ababa', 'Asia/Shanghai', 'Australia/Sydney',
]

interface CompanySettings {
  id?: string
  name: string
  logo_url: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  website: string | null
  tax_id: string | null
  registration_no: string | null
  currency: string
  timezone: string
}

export default function CompanyPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState<CompanySettings>({
    name: '',
    logo_url: null,
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    tax_id: '',
    registration_no: '',
    currency: 'USD',
    timezone: 'UTC',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) setSettings(data)
    } catch (error: any) {
      toast.error('Failed to load company settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (settings.id) {
        const { error } = await supabase
          .from('company_settings')
          .update({
            name: settings.name,
            logo_url: settings.logo_url,
            address: settings.address,
            city: settings.city,
            state: settings.state,
            country: settings.country,
            postal_code: settings.postal_code,
            phone: settings.phone,
            email: settings.email,
            website: settings.website,
            tax_id: settings.tax_id,
            registration_no: settings.registration_no,
            currency: settings.currency,
            timezone: settings.timezone,
          })
          .eq('id', settings.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('company_settings')
          .insert(settings)
          .select()
          .single()

        if (error) throw error
        if (data) setSettings(data)
      }

      toast.success('Company settings saved')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('company')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('company')
        .getPublicUrl(filePath)

      setSettings({ ...settings, logo_url: publicUrl })
      toast.success('Logo uploaded! Click Save to persist changes.')
    } catch (error: any) {
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Company Settings</h1>
          <p className="text-slate-600 mt-1">
            Manage your company information and preferences
          </p>
        </div>
        <PermissionGate module="settings" action="edit">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </PermissionGate>
      </div>

      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>
            Upload your company logo (max 2MB, PNG/JPG)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <PermissionGate module="settings" action="edit">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {settings.logo_url ? 'Change Logo' : 'Upload Logo'}
                    </>
                  )}
                </Button>
              </PermissionGate>
              {settings.logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-red-600"
                  onClick={() => setSettings({ ...settings, logo_url: null })}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Your company's primary details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              placeholder="Your Company Name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="info@company.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </Label>
              <Input
                id="phone"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="website">
              <Globe className="w-4 h-4 inline mr-1" />
              Website
            </Label>
            <Input
              id="website"
              value={settings.website || ''}
              onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              placeholder="https://company.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>
            <MapPin className="w-5 h-5 inline mr-2" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Street Address</Label>
            <Textarea
              id="address"
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="123 Main Street"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={settings.city || ''}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                value={settings.state || ''}
                onChange={(e) => setSettings({ ...settings, state: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={settings.country || ''}
                onChange={(e) => setSettings({ ...settings, country: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={settings.postal_code || ''}
                onChange={(e) => setSettings({ ...settings, postal_code: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Info */}
      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="w-5 h-5 inline mr-2" />
            Legal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
              <Input
                id="tax_id"
                value={settings.tax_id || ''}
                onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="registration_no">Registration Number</Label>
              <Input
                id="registration_no"
                value={settings.registration_no || ''}
                onChange={(e) => setSettings({ ...settings, registration_no: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>
            <DollarSign className="w-5 h-5 inline mr-2" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(v) => setSettings({ ...settings, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(v) => setSettings({ ...settings, timezone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}