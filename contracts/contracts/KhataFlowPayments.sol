// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract KhataFlowPayments {
    struct PaymentSchedule {
        uint256 debtTokenId;
        uint256 totalAmountPaise;
        uint256 installmentPaise;
        uint256 frequencySeconds;
        uint256 nextDueUnix;
        uint256 paidInstallments;
        uint256 totalInstallments;
        bool active;
        address businessWallet;
    }

    uint256 private _scheduleCount;

    mapping(uint256 => PaymentSchedule) public schedules;
    mapping(uint256 => uint256) public tokenToSchedule;

    event ScheduleCreated(
        uint256 indexed scheduleId,
        uint256 indexed debtTokenId,
        uint256 totalInstallments,
        uint256 frequencySeconds,
        uint256 firstDueUnix
    );

    event InstallmentRecorded(
        uint256 indexed scheduleId,
        uint256 installmentNumber,
        uint256 nextDueUnix
    );

    event ScheduleCompleted(uint256 indexed scheduleId, uint256 debtTokenId);
    event ScheduleCancelled(uint256 indexed scheduleId);

    function createSchedule(
        uint256 debtTokenId,
        uint256 totalAmountPaise,
        uint256 totalInstallments,
        uint256 frequencySeconds,
        uint256 firstDueUnix
    ) external returns (uint256) {
        require(totalInstallments > 0, "Must have at least 1 installment");
        require(frequencySeconds >= 3600, "Frequency must be at least 1 hour");
        require(firstDueUnix > block.timestamp, "First due date must be in future");
        require(tokenToSchedule[debtTokenId] == 0, "Schedule already exists for this token");

        _scheduleCount++;
        uint256 scheduleId = _scheduleCount;

        schedules[scheduleId] = PaymentSchedule({
            debtTokenId: debtTokenId,
            totalAmountPaise: totalAmountPaise,
            installmentPaise: totalAmountPaise / totalInstallments,
            frequencySeconds: frequencySeconds,
            nextDueUnix: firstDueUnix,
            paidInstallments: 0,
            totalInstallments: totalInstallments,
            active: true,
            businessWallet: msg.sender
        });

        tokenToSchedule[debtTokenId] = scheduleId;

        emit ScheduleCreated(scheduleId, debtTokenId, totalInstallments, frequencySeconds, firstDueUnix);
        return scheduleId;
    }

    function recordInstallment(uint256 scheduleId) external {
        PaymentSchedule storage schedule = schedules[scheduleId];
        require(schedule.active, "Schedule is not active");
        require(msg.sender == schedule.businessWallet, "Not authorized");

        schedule.paidInstallments++;
        schedule.nextDueUnix = block.timestamp + schedule.frequencySeconds;

        emit InstallmentRecorded(scheduleId, schedule.paidInstallments, schedule.nextDueUnix);

        if (schedule.paidInstallments >= schedule.totalInstallments) {
            schedule.active = false;
            emit ScheduleCompleted(scheduleId, schedule.debtTokenId);
        }
    }

    function cancelSchedule(uint256 scheduleId) external {
        PaymentSchedule storage schedule = schedules[scheduleId];
        require(schedule.active, "Already inactive");
        require(msg.sender == schedule.businessWallet, "Not authorized");

        schedule.active = false;
        emit ScheduleCancelled(scheduleId);
    }

    function getSchedule(uint256 scheduleId) external view returns (PaymentSchedule memory) {
        return schedules[scheduleId];
    }

    function isPaymentOverdue(uint256 scheduleId) external view returns (bool) {
        PaymentSchedule memory schedule = schedules[scheduleId];
        return schedule.active && block.timestamp > schedule.nextDueUnix;
    }

    function totalSchedules() external view returns (uint256) {
        return _scheduleCount;
    }
}
