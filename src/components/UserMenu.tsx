import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthModal } from "@/components/AuthModal";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, FileText, LogOut, ChevronDown, UserCog, Users, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserMenuProps {
    className?: string;
    showArrow?: boolean;
    variant?: "ghost" | "primary";
    size?: "default" | "sm" | "lg" | "icon";
}

export function UserMenu({ className, showArrow = true, variant = "ghost", size }: UserMenuProps) {
    const navigate = useNavigate();
    const { user, signOut, userStatus, userRole, isAdmin } = useAuth();
    const [profile, setProfile] = useState<{ full_name: string | null; company_name: string | null } | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [isWideModal, setIsWideModal] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, company_name')
                .eq('id', user.id)
                .single();
            if (data && !error) setProfile(data);
        };
        fetchProfile();
    }, [user]);

    const handleNavigation = (path: string) => {
        setIsPopoverOpen(false);
        if (userStatus === 'pending') {
            setShowPendingModal(true);
        } else {
            navigate(path);
        }
    };

    const getStatusBadge = () => {
        switch (userStatus) {
            case 'active':
                return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
            case 'pending':
                return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>;
            case 'denied':
                return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Denied</Badge>;
            default:
                return null;
        }
    };

    if (!user) return null;

    const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
    const displayCompany = profile?.company_name || '';

    return (
        <>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={variant === "primary" ? "default" : "ghost"}
                        size={size}
                        className={`flex items-center gap-2 ${className}`}
                    >
                        {variant === "primary" ? (
                            <>
                                <User className="w-4 h-4" />
                                <span className="flex flex-col items-start text-left leading-tight">
                                    <span className="text-sm font-semibold">{displayName}</span>
                                    {displayCompany && <span className="text-xs opacity-80">{displayCompany}</span>}
                                </span>
                            </>
                        ) : (
                            <>
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="hidden sm:inline text-sm font-medium">
                                    {displayName}
                                </span>
                            </>
                        )}

                        {showArrow && <ChevronDown className={`w-4 h-4 ${variant === "primary" ? "opacity-50" : "text-muted-foreground"}`} />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                    <div className="flex flex-col mb-3">
                        <p className="font-medium truncate">
                            {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {displayCompany || user.email}
                        </p>
                    </div>

                    <Separator className="my-2" />

                    <div className="space-y-1 mb-2">
                        <p className="text-xs text-muted-foreground">Account Status</p>
                        {getStatusBadge()}
                    </div>

                    <Separator className="my-2" />

                    <div className="flex flex-col gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleNavigation('/profile')}
                        >
                            <UserCog className="w-4 h-4 mr-2" />
                            Profile Settings
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleNavigation('/submissions')}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            My Submissions
                        </Button>

                        {userRole === 'manager' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => handleNavigation('/team')}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Team Management
                            </Button>
                        )}

                        {isAdmin && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => handleNavigation('/admin')}
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                Admin Dashboard
                            </Button>
                        )}
                    </div>

                    <Separator className="my-2" />

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                            setIsPopoverOpen(false);
                            signOut();
                        }}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </PopoverContent>
            </Popover>

            <Dialog open={showPendingModal} onOpenChange={(open) => {
                setShowPendingModal(open);
                if (!open) {
                    setIsWideModal(false);
                }
            }}>
                <DialogContent className={`max-w-[calc(100%-2rem)] rounded-lg transition-all duration-300 ease-in-out ${isWideModal ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
                    <AuthModal
                        initialView="account-pending"
                        onTabChange={(tab) => setIsWideModal(tab === 'signup')}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
