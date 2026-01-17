import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, CreditCard, DollarSign, Calendar, HelpCircle, MessageSquare, ChevronDown, Check } from 'lucide-react';

interface WizardStep2Props {
    ownerNames: string[];
    onComplete: (data: PersonalDetailsData) => void;
    onBack: () => void;
}

export interface PersonalDetailsData {
    ownerNames: string[];
    ownerEmails: string[];
    ownerPhones: string[];
    ownerCreditScores: string[];
    mortgageCurrent: boolean;
    moneyReasons: string[];
    moneyAmount: string;
    helpfulContext: string;
}

const CREDIT_SCORE_OPTIONS = [
    { value: 'excellent', label: 'Excellent (750+)' },
    { value: 'good', label: 'Good (700-749)' },
    { value: 'fair', label: 'Fair (650-699)' },
    { value: 'below_650', label: 'Below 650' },
    { value: 'unsure', label: 'Unsure' },
];

const MONEY_REASON_OPTIONS = [
    { value: 'paying_off_debt', label: 'Paying Off Debt' },
    { value: 'health_issues', label: 'Health Issues' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'life_events', label: 'Life Events' },
    { value: 'other', label: 'Other' },
];

const MONEY_AMOUNT_OPTIONS = [
    { value: 'under_25k', label: '<$25K' },
    { value: '25k_50k', label: '$25K - $50K' },
    { value: '50k_100k', label: '$50K - $100K' },
    { value: '100k_plus', label: '$100K+' },
];

// Multi-select dropdown component for reasons
function MultiSelectReasons({
    selectedReasons,
    onToggleReason,
}: {
    selectedReasons: string[];
    onToggleReason: (value: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDisplayText = () => {
        if (selectedReasons.length === 0) {
            return 'Select reasons (multiple allowed)';
        }
        if (selectedReasons.length === 1) {
            const option = MONEY_REASON_OPTIONS.find(o => o.value === selectedReasons[0]);
            return option?.label || selectedReasons[0];
        }
        return `${selectedReasons.length} reasons selected`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-10 w-full items-center justify-between rounded-md bg-background border-2 border-accent/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className={selectedReasons.length === 0 ? 'text-muted-foreground' : 'text-foreground'}>
                    {getDisplayText()}
                </span>
                <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-lg">
                    <p className="text-xs text-muted-foreground mb-2 px-1">
                        Select all that apply:
                    </p>
                    <div className="space-y-1">
                        {MONEY_REASON_OPTIONS.map((option) => {
                            const isSelected = selectedReasons.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    onClick={() => onToggleReason(option.value)}
                                    className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors ${isSelected
                                        ? 'bg-accent/20 text-foreground'
                                        : 'hover:bg-accent/10 text-muted-foreground'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected
                                        ? 'bg-accent border-accent'
                                        : 'border-muted-foreground/50'
                                        }`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-sm">{option.label}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 pt-2 border-t">
                        <Button
                            type="button"
                            size="sm"
                            variant="success"
                            className="w-full"
                            onClick={() => setIsOpen(false)}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function WizardStep2({ ownerNames, onComplete, onBack }: WizardStep2Props) {
    // Initialize state based on number of owners
    const ownerCount = ownerNames.length || 1;

    const [names, setNames] = useState<string[]>(
        ownerNames.length > 0 ? [...ownerNames] : ['']
    );
    const [emails, setEmails] = useState<string[]>(Array(ownerCount).fill(''));
    const [phones, setPhones] = useState<string[]>(Array(ownerCount).fill(''));
    const [creditScores, setCreditScores] = useState<string[]>(Array(ownerCount).fill(''));

    // Shared fields
    const [mortgageCurrent, setMortgageCurrent] = useState<boolean | null>(null);
    const [moneyReasons, setMoneyReasons] = useState<string[]>([]);
    const [moneyAmount, setMoneyAmount] = useState('');
    const [helpfulContext, setHelpfulContext] = useState('');

    const toggleReason = (value: string) => {
        setMoneyReasons(prev =>
            prev.includes(value)
                ? prev.filter(r => r !== value)
                : [...prev, value]
        );
    };

    const updateName = (index: number, value: string) => {
        const newNames = [...names];
        newNames[index] = value;
        setNames(newNames);
    };

    const updateEmail = (index: number, value: string) => {
        const newEmails = [...emails];
        newEmails[index] = value;
        setEmails(newEmails);
    };

    const updatePhone = (index: number, value: string) => {
        const newPhones = [...phones];
        newPhones[index] = value;
        setPhones(newPhones);
    };

    const updateCreditScore = (index: number, value: string) => {
        const newScores = [...creditScores];
        newScores[index] = value;
        setCreditScores(newScores);
    };

    const formatPhoneNumber = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    };

    const handlePhoneChange = (index: number, value: string) => {
        updatePhone(index, formatPhoneNumber(value));
    };

    // Validation
    const isValid = () => {
        // Check all owner-specific fields
        for (let i = 0; i < ownerCount; i++) {
            if (!names[i]?.trim()) return false;
            if (!emails[i]?.trim() || !emails[i].includes('@')) return false;
            if (!phones[i]?.trim() || phones[i].replace(/\D/g, '').length < 10) return false;
            if (!creditScores[i]) return false;
        }
        // Check shared fields
        if (mortgageCurrent === null) return false;
        if (moneyReasons.length === 0) return false;
        if (!moneyAmount) return false;
        return true;
    };

    const handleContinue = () => {
        if (isValid()) {
            onComplete({
                ownerNames: names,
                ownerEmails: emails,
                ownerPhones: phones,
                ownerCreditScores: creditScores,
                mortgageCurrent: mortgageCurrent!,
                moneyReasons,
                moneyAmount,
                helpfulContext,
            });
        }
    };

    const renderOwnerSection = (index: number) => {
        const isMultipleOwners = ownerCount > 1;
        const sectionTitle = isMultipleOwners ? `Homeowner ${index + 1}` : 'Homeowner Details';

        return (
            <div key={index} className="p-4 bg-secondary rounded-xl border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-accent" />
                    {sectionTitle}
                </h3>

                <div className="space-y-4">
                    {/* Owner Name */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-foreground/70 font-medium flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-accent" />
                            Full Name
                        </Label>
                        <Input
                            type="text"
                            value={names[index] || ''}
                            onChange={(e) => updateName(index, e.target.value)}
                            placeholder="Enter full name"
                            className="bg-background border-2 border-accent/50 focus:border-accent"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-foreground/70 font-medium flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-accent" />
                            Email Address
                        </Label>
                        <Input
                            type="email"
                            value={emails[index] || ''}
                            onChange={(e) => updateEmail(index, e.target.value)}
                            placeholder="email@example.com"
                            className="bg-background border-2 border-accent/50 focus:border-accent"
                        />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-foreground/70 font-medium flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-accent" />
                            Phone Number
                        </Label>
                        <Input
                            type="tel"
                            value={phones[index] || ''}
                            onChange={(e) => handlePhoneChange(index, e.target.value)}
                            placeholder="(555) 555-5555"
                            className="bg-background border-2 border-accent/50 focus:border-accent"
                        />
                    </div>

                    {/* Credit Score */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-foreground/70 font-medium flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-accent" />
                            Estimated Credit Score
                        </Label>
                        <Select value={creditScores[index] || ''} onValueChange={(value) => updateCreditScore(index, value)}>
                            <SelectTrigger className="bg-background border-2 border-accent/50 focus:border-accent">
                                <SelectValue placeholder="Select credit score range" />
                            </SelectTrigger>
                            <SelectContent>
                                {CREDIT_SCORE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        );
    };

    const renderFinancialDetails = () => (
        <div className="p-4 bg-secondary rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                Financial Details
            </h3>

            <div className="space-y-4">
                {/* Mortgage Current - Yes/No Toggle */}
                <div className="space-y-2">
                    <Label className="text-xs text-foreground/70 font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        Have you been current on your mortgage for the last 12 months?
                    </Label>
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant={mortgageCurrent === true ? 'default' : 'outline'}
                            className={`flex-1 ${mortgageCurrent === true ? 'bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white' : ''}`}
                            onClick={() => setMortgageCurrent(true)}
                        >
                            Yes
                        </Button>
                        <Button
                            type="button"
                            variant={mortgageCurrent === false ? 'default' : 'outline'}
                            className={`flex-1 ${mortgageCurrent === false ? 'bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white' : ''}`}
                            onClick={() => setMortgageCurrent(false)}
                        >
                            No
                        </Button>
                    </div>
                </div>

                {/* Reason for Money - Multi-select */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-foreground/70 font-medium flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-accent" />
                        Reason for Seeking Funds
                    </Label>
                    <MultiSelectReasons
                        selectedReasons={moneyReasons}
                        onToggleReason={toggleReason}
                    />
                </div>

                {/* Amount Looking For */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-foreground/70 font-medium flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-accent" />
                        How Much Are You Looking For?
                    </Label>
                    <Select value={moneyAmount} onValueChange={setMoneyAmount}>
                        <SelectTrigger className="bg-background border-2 border-accent/50 focus:border-accent">
                            <SelectValue placeholder="Select amount range" />
                        </SelectTrigger>
                        <SelectContent>
                            {MONEY_AMOUNT_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );

    const renderHelpfulContextSection = () => (
        <div className="p-4 bg-secondary rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                Helpful Context for StayFrank
            </h3>

            <Textarea
                value={helpfulContext}
                onChange={(e) => setHelpfulContext(e.target.value)}
                placeholder="E.g., homeowner's timeline, special circumstances, additional notes..."
                className="bg-background border-2 border-accent/50 focus:border-accent min-h-[80px] resize-none"
            />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Desktop Layout */}
            <div className="hidden md:block">
                {/* Two owners: side by side owners, then financial details below */}
                {ownerCount > 1 ? (
                    <>
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            {Array.from({ length: ownerCount }).map((_, i) => renderOwnerSection(i))}
                        </div>

                        {/* Shared Fields Card */}
                        <div className="mb-4">
                            {renderFinancialDetails()}
                        </div>

                        {/* Helpful Context Section */}
                        <div className="mb-4">
                            {renderHelpfulContextSection()}
                        </div>
                    </>
                ) : (
                    /* Single owner: homeowner details on left, financial details on right */
                    <>
                        <div className="grid grid-cols-2 gap-6 mb-4">
                            {/* Left Column - Homeowner Details */}
                            {renderOwnerSection(0)}

                            {/* Right Column - Financial Details */}
                            {renderFinancialDetails()}
                        </div>

                        {/* Helpful Context Section - Full width below */}
                        <div className="mb-4">
                            {renderHelpfulContextSection()}
                        </div>
                    </>
                )}
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
                {/* Owner sections - stacked */}
                {Array.from({ length: ownerCount }).map((_, i) => renderOwnerSection(i))}

                {/* Financial Details Card */}
                {renderFinancialDetails()}

                {/* Helpful Context Section */}
                {renderHelpfulContextSection()}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <Button variant="outline" onClick={onBack} className="flex-1">
                    Back
                </Button>
                <Button
                    variant="success"
                    onClick={handleContinue}
                    className="flex-1"
                    disabled={!isValid()}
                >
                    Continue to Review
                </Button>
            </div>
        </div>
    );
}
