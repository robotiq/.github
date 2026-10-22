# Robotiq — Open-source software tools for developers

## Software tool index

Summary of available tools, by product.

- ![Robotiq](https://img.shields.io/badge/Robotiq-blue) — official, Robotiq-maintained
- ![Third party](https://img.shields.io/badge/Third_party-lightgrey) — community-maintained

Click a badge to go to where the tool is hosted. Once there, follow that
platform's own instructions to find your way to the software tool.

### Libraries

| Product | C | C++ | Python |
|---|---|---|---|
| Adaptive grippers | - | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/grippers) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/castetsb/pyRobotiqGripper) |
| Force Torque Sensor | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://robotiq.com/support) | - | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/castetsb/pyFT300) |
| Tactile Sensor | - | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/tactile_sensors) | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/tactile_sensors) |

- **C** — Compiled, performance-oriented language.
- **C++** — Compiled, performance-oriented object-oriented language.
- **Python** — Interpreted, prototyping-oriented language.

### ROS

| Product | ROS |
|---|---|
| Adaptive grippers | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-ros) |
| EPick | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/PickNikRobotics/ros2_epick_gripper) |
| Force Torque Sensor | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/panagelak/rq_fts_ros2_driver) |
| Tactile Sensor | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/robotiq-ros) |

### Simulation

| Product | Isaac Sim | PyBullet | MuJoCo |
|---|---|---|---|
| Adaptive grippers | [![Robotiq](https://img.shields.io/badge/Robotiq-blue)](https://github.com/robotiq/isaacsim_assets) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/ElectronicElephant/pybullet_ur5_robotiq) | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/google-deepmind/mujoco_menagerie/tree/main/robotiq_2f85) |
| Tactile Sensor | [![Third party](https://img.shields.io/badge/Third_party-lightgrey)](https://github.com/Lab-CORO/TSF-85) | - | - |

- **Isaac Sim** — NVIDIA Isaac Sim integration for simulating the hardware.
- **PyBullet** — PyBullet integration for physics-based simulation.
- **MuJoCo** — MuJoCo (MJCF) model for physics-based simulation.

### Other community projects

| Product | Project |
|---|---|
| Adaptive grippers | [GraspGen](https://github.com/NVlabs/GraspGen) — NVIDIA's diffusion-based framework for 6-DOF grasping, with Robotiq gripper definitions |

## Repositories

Maintained by hand — not auto-generated. May drift as repos are added,
renamed, or archived; see [#10](https://github.com/robotiq/.github/issues/10)
for a possible automated replacement.

| Repository | Description |
|---|---|
| [grippers](https://github.com/robotiq/grippers) | Robotiq Adaptive Gripper SDK (C++ controller, ...) |
| [isaacsim_assets](https://github.com/robotiq/isaacsim_assets) | Isaac Sim assets for Robotiq hardware |
| [robotiq-ros](https://github.com/robotiq/robotiq-ros) | ROS packages for Robotiq hardware |
| [tactile_sensors](https://github.com/robotiq/tactile_sensors) | Robotiq Tactile Sensor SDK (C++ controller, Python viewer,...) |
