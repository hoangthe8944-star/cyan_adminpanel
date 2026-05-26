import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";

export function Settings() {
  return (
    <div className="max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="font-heading mb-2">Settings</h1>
        <p className="text-[#5a6169]">Manage your admin panel preferences</p>
      </div>

      <Card className="mb-6 border-[rgba(6,20,27,0.1)] bg-white p-6">
        <h3 className="font-heading mb-4">Brand Settings</h3>
        <div className="space-y-4">
          <div>
            <Label>Store Name</Label>
            <Input defaultValue="Cyan Jewelry" className="mt-1.5" />
          </div>
          <div>
            <Label>Store Tagline</Label>
            <Input defaultValue="Timeless Elegance, Modern Luxury" className="mt-1.5" />
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input type="email" defaultValue="contact@cyanjewelry.com" className="mt-1.5" />
          </div>
        </div>
      </Card>

      <Card className="mb-6 border-[rgba(6,20,27,0.1)] bg-white p-6">
        <h3 className="font-heading mb-4">Display Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode Sidebar</Label>
              <p className="mt-1 text-sm text-[#5a6169]">Keep the signature dark blue sidebar (#06141B)</p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-[#06141B]" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Gold Accent Colors</Label>
              <p className="mt-1 text-sm text-[#5a6169]">Use luxury gold highlights throughout the interface</p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-[#06141B]" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Compact View</Label>
              <p className="mt-1 text-sm text-[#5a6169]">Reduce spacing for more content on screen</p>
            </div>
            <Switch className="data-[state=checked]:bg-[#06141B]" />
          </div>
        </div>
      </Card>

      <Card className="mb-6 border-[rgba(6,20,27,0.1)] bg-white p-6">
        <h3 className="font-heading mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>New Orders</Label>
            <Switch defaultChecked className="data-[state=checked]:bg-[#06141B]" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label>Low Stock Alerts</Label>
            <Switch defaultChecked className="data-[state=checked]:bg-[#06141B]" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label>Customer Reviews</Label>
            <Switch className="data-[state=checked]:bg-[#06141B]" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-[#06141B] px-8 text-white hover:bg-[#0a1f29]">Save Changes</Button>
      </div>
    </div>
  );
}
