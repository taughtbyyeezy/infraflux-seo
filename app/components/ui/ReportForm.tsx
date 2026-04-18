import React, { useRef, useEffect, useState } from 'react';
import { Navigation, PlusCircle, ChevronRight } from 'lucide-react';
import { IssueType } from '../../types';
import { hapticButton } from '../../utils/haptic';
import ImageUpload from './ImageUpload';
import { Spinner } from '../Skeleton';

interface ReportFormData {
    type: IssueType;
    note: string;
    imageUrl: string;
    imageFile: File | null;
    location: [number, number] | null;
    magnitude: number;
    honeypot?: string;
    userLocation?: [number, number] | null;
    mla_name?: string;
    party?: string;
    ac_name?: string;
    st_name?: string;
    dist_name?: string;
}

export const ReportForm: React.FC<ReportFormProps> = (props) => {
    const [isUploading, setIsUploading] = useState(false);
    return <MobileReportForm {...props} isUploading={isUploading} setIsUploading={setIsUploading} isSubmitting={props.isSubmitting} />;
};

export default ReportForm;
