<?php
/*
##### ������Ʈ�α� #####
2021.06.14 ������ �ű�
2021.06.15 ������ ���� (�Լ��̸� �޾Ƽ� ���� insert�Լ� ����)

*/
$data = json_decode(file_get_contents('php://input'), true);
$func_nm = $data['func_nm'];
$output = $func_nm($data);
echo json_encode($output);
?>