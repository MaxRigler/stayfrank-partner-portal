import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, CreditCard, DollarSign, Calendar, HelpCircle, MessageSquare, ChevronDown, Check, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFundingReasons } from '@/hooks/useFundingReasons';

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
    { value: '620_plus', label: '620+' },
    { value: '580_620', label: '580-620' },
    { value: '550_580', label: '550-580' },
    { value: 'below_550', label: 'Below 550' },
];

// Fallback if dynamic options fail to load
const DEFAULT_MONEY_REASON_OPTIONS = [
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
    options,
}: {
    selectedReasons: string[];
    onToggleReason: (value: string) => void;
    options: { value: string; label: string }[];
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
            const option = options.find(o => o.value === selectedReasons[0]);
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
                        {options.map((option) => {
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
    // Fetch dynamic funding reasons from Supabase
    const { reasons: fundingReasons, loading: reasonsLoading } = useFundingReasons();

    // Convert to options format, fallback to defaults if empty
    const moneyReasonOptions = fundingReasons.length > 0
        ? fundingReasons.map(r => ({ value: r.value, label: r.label }))
        : DEFAULT_MONEY_REASON_OPTIONS;

    // Simplified state - single homeowner assumption
    const [creditScore, setCreditScore] = useState('');

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

    // Validation - simplified for single homeowner
    const isValid = () => {
        if (mortgageCurrent === null) return false;
        if (moneyReasons.length === 0) return false;
        if (!moneyAmount) return false;
        if (!creditScore) return false;
        return true;
    };

    const handleContinue = () => {
        if (isValid()) {
            onComplete({
                // Maintain backward compatibility with existing interface
                ownerNames: ownerNames.length > 0 ? ownerNames : [''],
                ownerEmails: [''],
                ownerPhones: [''],
                ownerCreditScores: [creditScore],
                mortgageCurrent: mortgageCurrent!,
                moneyReasons,
                moneyAmount,
                helpfulContext,
            });
        }
    };

    const renderFinancialDetails = () => (
        <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-full">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    Financial Details
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Mortgage Current - Yes/No Toggle */}
                <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider pl-1 text-left block">
                        Current on mortgage (last 12 months)?
                    </Label>
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant={mortgageCurrent === true ? 'default' : 'outline'}
                            className={`flex-1 h-11 text-base ${mortgageCurrent === true ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent' : 'hover:border-emerald-500/50 hover:bg-emerald-50'}`}
                            onClick={() => setMortgageCurrent(true)}
                        >
                            Yes
                        </Button>
                        <Button
                            type="button"
                            variant={mortgageCurrent === false ? 'default' : 'outline'}
                            className={`flex-1 h-11 text-base ${mortgageCurrent === false ? 'bg-destructive hover:bg-destructive/90 text-white border-transparent' : 'hover:border-destructive/50 hover:bg-destructive/5'}`}
                            onClick={() => setMortgageCurrent(false)}
                        >
                            No
                        </Button>
                    </div>
                </div>

                {/* Reason for Money - Multi-select */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider pl-1 text-left block">
                        Reason for Seeking Funds
                    </Label>
                    <MultiSelectReasons
                        selectedReasons={moneyReasons}
                        onToggleReason={toggleReason}
                        options={moneyReasonOptions}
                    />
                </div>

                {/* Amount Looking For */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider pl-1 text-left block">
                        How Much Are You Looking For?
                    </Label>
                    <Select value={moneyAmount} onValueChange={setMoneyAmount}>
                        <SelectTrigger className="bg-background h-11 border-input focus:border-emerald-500 focus:ring-emerald-500/20">
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

                {/* Estimated Credit Score - moved from Homeowner Details */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider pl-1 text-left block">
                        Estimated Credit Score Range
                    </Label>
                    <Select value={creditScore} onValueChange={setCreditScore}>
                        <SelectTrigger className="bg-background h-11 border-input focus:border-emerald-500 focus:ring-emerald-500/20">
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
            </CardContent>
        </Card>
    );

    const renderHelpfulContextSection = () => (
        <Card className="border-t-4 border-t-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-2 bg-purple-500/10 rounded-full">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                    </div>
                    Helpful Context for StayFrank
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <Textarea
                        value={helpfulContext}
                        onChange={(e) => setHelpfulContext(e.target.value)}
                        placeholder="E.g., homeowner's timeline, special circumstances, additional notes..."
                        className="bg-background min-h-[100px] resize-none border-input focus:border-purple-500 focus:ring-purple-500/20 pt-3"
                    />
                    <div className="absolute top-3 right-3 opacity-50">
                        <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-4">
            {/* Desktop Layout - Single column with Financial Details on top */}
            <div className="hidden md:block space-y-4">
                {renderFinancialDetails()}
                {renderHelpfulContextSection()}
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
                {renderFinancialDetails()}
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
