import { useState, useEffect } from "react";
import { User, Store, FileText, MapPin, Phone, Mail, Calendar, Shield, LogOut, Edit2, Save, X, ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { bakerAPI } from "@/api/baker";

interface BakerProfile {
  id: number;
  user_id: number;
  shop_name: string;
  owner_name: string;
  phone: string;
  email: string;
  business_license: string;
  tax_id: string;
  shop_address: string;
  city: string;
  state: string;
  zip_code: string;
  shop_description: string;
  verified: boolean;
  created_at: string;
}

interface BakerProfileProps {
  onLogout: () => void;
}

export function BakerProfile({ onLogout }: BakerProfileProps) {
  const [profile, setProfile] = useState<BakerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<BakerProfile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await bakerAPI.getProfile();
      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile(profile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile);
  };

  const handleSave = async () => {
    try {
      if (editedProfile) {
        await bakerAPI.updateProfile(editedProfile);
        setProfile(editedProfile);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#D35400] mx-auto mb-4"></div>
          <p className="text-[#4E342E]/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-[#4E342E] mb-4">Failed to load profile</p>
            <Button onClick={onLogout} className="bg-[#D35400] hover:bg-[#D35400]/90 text-white">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7] py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <button
              onClick={() => window.location.hash = 'dashboard'}
              className="flex items-center gap-2 text-[#D35400] hover:text-[#D35400]/80 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-[#4E342E] mb-2">
              Welcome back, {profile.owner_name}!
            </h1>
            <p className="text-[#4E342E]/60">Manage your bakery profile</p>
          </div>
          <Button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Verification Status */}
        {profile.verified ? (
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Verified Bakery</p>
                <p className="text-sm text-green-600">Your bakery is verified and active on the marketplace</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Verification Pending</p>
                <p className="text-sm text-amber-600">Your bakery is under review. You'll be notified once verified.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Information */}
        <Card className="bg-white shadow-lg rounded-2xl">
          <CardContent className="p-8">
            {/* Edit Actions */}
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-[#4E342E]/10">
              <h2 className="text-2xl font-bold text-[#4E342E]">Profile Information</h2>
              {!isEditing ? (
                <Button
                  onClick={handleEdit}
                  className="bg-[#D35400] hover:bg-[#D35400]/90 text-white gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    className="bg-[#829460] hover:bg-[#829460]/90 text-white gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                  <Button
                    onClick={handleCancel}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-8">
              {/* Basic Information */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Store className="w-5 h-5 text-[#D35400]" />
                  <h3 className="text-xl font-semibold text-[#4E342E]">Business Details</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-[#4E342E]/60 mb-1 block">Shop Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedProfile?.shop_name || ''}
                        onChange={(e) => setEditedProfile(prev => prev ? {...prev, shop_name: e.target.value} : null)}
                        className="w-full px-4 py-2 border-2 border-[#4E342E]/20 rounded-lg focus:border-[#D35400] outline-none"
                      />
                    ) : (
                      <p className="text-[#4E342E] font-medium">{profile.shop_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-[#4E342E]/60 mb-1 block">Owner Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedProfile?.owner_name || ''}
                        onChange={(e) => setEditedProfile(prev => prev ? {...prev, owner_name: e.target.value} : null)}
                        className="w-full px-4 py-2 border-2 border-[#4E342E]/20 rounded-lg focus:border-[#D35400] outline-none"
                      />
                    ) : (
                      <p className="text-[#4E342E] font-medium">{profile.owner_name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-[#D35400]" />
                  <h3 className="text-xl font-semibold text-[#4E342E]">Contact Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-[#4E342E]/60 mb-1 block flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </label>
                    <p className="text-[#4E342E] font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[#4E342E]/60 mb-1 block flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedProfile?.phone || ''}
                        onChange={(e) => setEditedProfile(prev => prev ? {...prev, phone: e.target.value} : null)}
                        className="w-full px-4 py-2 border-2 border-[#4E342E]/20 rounded-lg focus:border-[#D35400] outline-none"
                      />
                    ) : (
                      <p className="text-[#4E342E] font-medium">{profile.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Verification */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-[#D35400]" />
                  <h3 className="text-xl font-semibold text-[#4E342E]">Business Verification</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-[#4E342E]/60 mb-1 block">Business License Number</label>
                    <p className="text-[#4E342E] font-medium">{profile.business_license}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[#4E342E]/60 mb-1 block">Tax ID / EIN</label>
                    <p className="text-[#4E342E] font-medium">{profile.tax_id}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-[#D35400]" />
                  <h3 className="text-xl font-semibold text-[#4E342E]">Shop Location</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-[#4E342E]/60 mb-1 block">Street Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedProfile?.shop_address || ''}
                        onChange={(e) => setEditedProfile(prev => prev ? {...prev, shop_address: e.target.value} : null)}
                        className="w-full px-4 py-2 border-2 border-[#4E342E]/20 rounded-lg focus:border-[#D35400] outline-none"
                      />
                    ) : (
                      <p className="text-[#4E342E] font-medium">{profile.shop_address}</p>
                    )}
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-[#4E342E]/60 mb-1 block">City</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedProfile?.city || ''}
                          onChange={(e) => setEditedProfile(prev => prev ? {...prev, city: e.target.value} : null)}
                          className="w-full px-4 py-2 border-2 border-[#4E342E]/20 rounded-lg focus:border-[#D35400] outline-none"
                        />
                      ) : (
                        <p className="text-[#4E342E] font-medium">{profile.city}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-[#4E342E]/60 mb-1 block">State</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedProfile?.state || ''}
                          onChange={(e) => setEditedProfile(prev => prev ? {...prev, state: e.target.value} : null)}
                          className="w-full px-4 py-2 border-2 border-[#4E342E]/20 rounded-lg focus:border-[#D35400] outline-none"
                        />
                      ) : (
                        <p className="text-[#4E342E] font-medium">{profile.state}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-[#4E342E]/60 mb-1 block">ZIP Code</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedProfile?.zip_code || ''}
                          onChange={(e) => setEditedProfile(prev => prev ? {...prev, zip_code: e.target.value} : null)}
                          className="w-full px-4 py-2 border-2 border-[#4E342E]/20 rounded-lg focus:border-[#D35400] outline-none"
                        />
                      ) : (
                        <p className="text-[#4E342E] font-medium">{profile.zip_code}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shop Description */}
              <div>
                <label className="text-sm text-[#4E342E]/60 mb-2 block">About Your Bakery</label>
                {isEditing ? (
                  <textarea
                    value={editedProfile?.shop_description || ''}
                    onChange={(e) => setEditedProfile(prev => prev ? {...prev, shop_description: e.target.value} : null)}
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-[#4E342E]/20 rounded-lg focus:border-[#D35400] outline-none resize-none"
                  />
                ) : (
                  <p className="text-[#4E342E] bg-[#FFF9F5] p-4 rounded-lg">{profile.shop_description}</p>
                )}
              </div>

              {/* Registration Date */}
              <div className="pt-6 border-t border-[#4E342E]/10">
                <div className="flex items-center gap-2 text-[#4E342E]/60">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Member since {formatDate(profile.created_at)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
