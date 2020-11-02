// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { AnyAction } from 'redux';
import { useSelector, useDispatch } from 'react-redux';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Modal from 'antd/lib/modal';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import RadioButton from 'antd/lib/radio/radioButton';
import { Row, Col } from 'antd/lib/grid';

import UserSelector from 'components/task-page/user-selector';
import { CombinedState, ReviewStatus } from 'reducers/interfaces';
import { switchSubmitReviewDialog } from 'actions/annotation-actions';
import { submitReviewAsync } from 'actions/review-actions';
import { clamp } from 'utils/math';
import InputNumber from 'antd/lib/input-number';

function computeEstimatedQuality(reviewedStates: number, openedIssues: number): number {
    if (reviewedStates === 0 && openedIssues === 0) {
        return 5; // corner case
    }

    const K = 2; // means how many reviewed states are equivalent to one issue
    const quality = reviewedStates / (reviewedStates + K * openedIssues);
    return clamp(+(5 * quality).toPrecision(2), 0, 5);
}

export default function SubmitReviewModal(): JSX.Element | null {
    const dispatch = useDispatch();
    const isVisible = useSelector((state: CombinedState): boolean => state.annotation.submitReviewDialogVisible);
    const users = useSelector((state: CombinedState): any[] => state.users.users);
    const job = useSelector((state: CombinedState): any => state.annotation.job.instance);
    const activeReview = useSelector((state: CombinedState): any => state.review.activeReview);
    const numberOfIssues = useSelector((state: CombinedState): any => state.review.issues.length);

    const numberOfNewIssues = activeReview ? activeReview.issues.length : 0;
    const reviewedFrames = activeReview ? activeReview.reviewedFrames.length : 0;
    const reviewedStates = activeReview ? activeReview.reviewedStates.length : 0;

    const [reviewer, setReviewer] = useState(job.reviewer ? job.reviewer : users[0]);
    const [reviewStatus, setReviewStatus] = useState<string>(ReviewStatus.REVIEW_FURTHER);
    const [estimatedQuality, setEstimatedQuality] = useState<number>(0);

    useEffect(() => {
        setEstimatedQuality(computeEstimatedQuality(reviewedStates, numberOfNewIssues));
    }, [reviewedStates, numberOfNewIssues]);

    const close = (): AnyAction => dispatch(switchSubmitReviewDialog(false));
    const submitReview = (): void => {
        activeReview.estimatedQuality = estimatedQuality;
        activeReview.status = reviewStatus;
        if (reviewStatus === ReviewStatus.REVIEW_FURTHER) {
            activeReview.reviewer = reviewer;
        }
        dispatch(submitReviewAsync(activeReview));
        close();
    };

    if (!isVisible) {
        return null;
    }

    return (
        <Modal
            className='cvat-submit-review-dialog'
            visible={isVisible}
            destroyOnClose
            onCancel={close}
            onOk={submitReview}
            okButtonProps={{
                children: 'Submit',
            }}
        >
            <Row type='flex' justify='start'>
                <Col>
                    <Title level={4}>Submitting your review</Title>
                </Col>
            </Row>
            <Row type='flex' justify='start'>
                <Col span={12}>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <Text strong>Estimated quality: </Text>
                                </td>
                                <td>{estimatedQuality}</td>
                            </tr>
                            <tr>
                                <td>
                                    <Text strong>Issues: </Text>
                                </td>
                                <td>
                                    <Text>{numberOfIssues}</Text>
                                    {!!numberOfNewIssues && <Text strong>{` (+${numberOfNewIssues})`}</Text>}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <Text strong>Reviewed frames: </Text>
                                </td>
                                <td>{reviewedFrames}</td>
                            </tr>
                            <tr>
                                <td>
                                    <Text strong>Reviewed objects: </Text>
                                </td>
                                <td>{reviewedStates}</td>
                            </tr>
                        </tbody>
                    </table>
                </Col>
                <Col span={12}>
                    <Row>
                        <Col>
                            <Radio.Group
                                size='small'
                                value={reviewStatus}
                                onChange={(event: RadioChangeEvent) => {
                                    if (typeof event.target.value !== 'undefined') {
                                        setReviewStatus(event.target.value);
                                    }
                                }}
                            >
                                <RadioButton value={ReviewStatus.REVIEW_FURTHER}>Review next</RadioButton>
                                <RadioButton value={ReviewStatus.REJECTED}>Rejected</RadioButton>
                                <RadioButton value={ReviewStatus.ACCEPTED}>Accepted</RadioButton>
                            </Radio.Group>
                            {reviewStatus === ReviewStatus.REVIEW_FURTHER && (
                                <Row type='flex' justify='start'>
                                    <Col>
                                        <Text type='secondary'>Reviewer: </Text>
                                    </Col>
                                    <Col offset={1}>
                                        <UserSelector
                                            value={reviewer.username}
                                            users={users}
                                            onChange={(id: string) => {
                                                const [user] = users.filter((_user: any): boolean => _user.id === +id);
                                                if (user) {
                                                    setReviewer(user);
                                                }
                                            }}
                                        />
                                    </Col>
                                </Row>
                            )}
                            <Row type='flex' justify='start' align='middle'>
                                <Col>
                                    <Text type='secondary'>Make an assessment: </Text>
                                </Col>
                                <Col offset={1}>
                                    <InputNumber
                                        min={0}
                                        max={5}
                                        step={0.1}
                                        size='small'
                                        value={estimatedQuality}
                                        onChange={(value: number | undefined) => {
                                            if (typeof value !== 'undefined') {
                                                setEstimatedQuality(value);
                                            }
                                        }}
                                    />
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Modal>
    );
}
